/**
 *
 */

import { ISchemaProperties, IInitializerOptions, IDictionary } from './abstract';
import { deleteUtils } from './utils';
import { execFileSync } from 'child_process';
import { prompt } from './prompt-promise';
import { cyan } from 'colors/safe';
import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';

const merge = require('merge');

// tslint:disable-next-line:max-line-length
const SEMVER_PATTERN = /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:(?:\d*[A-Za-z-][0-9A-Za-z-]*|(?:0|[1-9]\d*))\.)*(?:\d*[A-Za-z-][0-9A-Za-z-]*|(?:0|[1-9]\d*))))?(?:\+((?:(?:[0-9A-Za-z-]+)\.)*[0-9A-Za-z-]+))?/gm;
const EXEC_FILE_SYNC_TIMEOUT = 15000;

export const DEFAULT_PROPERTIES: ISchemaProperties[] = [
    {
        name: 'name',
        description: 'Qual o nome do projeto? @trese/',
        message: 'Por favor, informe um nome válido para o projeto',
        pattern: /^[a-z][a-z0-9-]+$/,
        required: true,
        before(name: string) {
            return '@trese/' + name;
        },
    }, {
        name: 'description',
        description: 'Descrição do projeto:',
        required: false,
        default: '',
    }, {
        name: 'version',
        description: 'Informe a versão incial (SemVer):',
        message: 'Informe uma versão semântica válida (http://semver.org)',
        default: '0.1.0',
        pattern: SEMVER_PATTERN,
    }, {
        name: 'license',
        description: 'Qual o tipo de licensa do projeto?',
        default: 'UNLICENSED',
    }, {
        name: 'repository',
        description: 'Qual a URL do repositorio?',
        required: false,
        format: 'url',
    }, {
        name: 'author',
        description: 'Qual o nome do autor do projeto?',
        required: false,
    },
];

export const DEFAULT_OPTIONS: IInitializerOptions = {
    projectPath: '.',
    initializeGit: true,
    createReadme: true,
    delete: [
        { path: '.git', onError: deleteUtils.abortOnError }
    ],
    banner: [
        `${cyan('>>>')} ASSISTENTE DE INICIALIZAÇÃO DE TEMPLATES ${cyan('<<<')}`,
        '',
        `Este assistente inicializará o template atual com os dados do seu novo projeto.`,
        `Responda às perguntas pertinentes e, ao final, seu projeto estará pronto para`,
        `ser comitado ao repositório, se aplicável.`
    ],
};

function out(...args: any[]): void {

    console.log.call(console, ...args);

}

function outErr(...args: any[]): void {

    console.error.call(console, ...args);

}

export class Initializer {

    private readonly PROJECT_PATH: string;
    private readonly PACKAGE_PATH: string;
    private readonly GIT_PATH: string;
    private readonly README_PATH: string;
    private values: IDictionary<any>;
    private package: IDictionary<any>;
    private packageExisted = false;

    constructor(private options: IInitializerOptions, private properties = DEFAULT_PROPERTIES) {

        this.options = merge(DEFAULT_OPTIONS, options);

        if (this.options.initializeGit === true) {
            this.options.initializeGit = 'repository';
        }

        this.PROJECT_PATH = path.resolve(this.options.projectPath);
        this.PACKAGE_PATH = path.resolve(this.PROJECT_PATH, 'package.json');
        this.GIT_PATH = path.resolve(this.PROJECT_PATH, '.git');
        this.README_PATH = path.resolve(this.PROJECT_PATH, 'README.md');

    }

    async start() {

        prompt.delimiter = '';
        prompt.message = '';
        prompt.colors = false;
        prompt.start();

        this.printBanner();

        // Perguntas coloridas?
        for (const property of this.properties) {
            if (property.description) {
                property.description = cyan(property.description);
            }
        }

        const pak = this.loadPackage();

        do {

            try {
                // Pedimos os dados ao usuário
                await this.readValues();

                out();

                // Se não confirmar, reiniciamos o questionário
                if (!await this.confirmValues()) {
                    continue;
                }

                out();

                // Gravamos o package.json
                this.writePackage();

                out();

                // Criando README.md
                if (this.options.createReadme) {
                    this.createReadme();
                    out();
                }

                // Deletando paths configurados
                if (this.options.delete && this.options.delete.length) {
                    this.deletePaths();
                    out();
                }

                // Deve inicializar Git?
                if (this.options.initializeGit) {
                    await this.initializeGit();
                    out();
                }

                out(cyan('Pronto!'));

                return;
            }
            catch (error) {
                out();

                // Ctrl+C
                if (error && error.message && error.message === 'canceled') {
                    out(cyan('Cancelando...'));
                    return;
                }

                throw error;
            }

        } while (true);

    }

    private printBanner(): void {

        const banner = this.options.banner;

        if (banner) {
            out();

            if (typeof banner === 'string') {
                out(banner);
            }
            else if (banner.length) {
                for (const bannerLine of banner) {
                    out(bannerLine);
                }
            }
            else {
                out(banner);
            }

            out();
        }

    }

    private loadPackage(): IDictionary<any> {

        // Já tem package.json?
        if (fs.existsSync(this.PACKAGE_PATH)) {
            try {
                this.package = require(this.PACKAGE_PATH);
                this.packageExisted = true;
            }
            catch (error) {
                outErr(`Não foi possivel abrir o arquivo ${this.PACKAGE_PATH}`.red);
                throw error;
            }
        }
        else {
            this.package = {};
            this.packageExisted = false;
        }

        return this.package;

    }

    private async readValues(): Promise<IDictionary<any>> {

        return this.values = await prompt.get(this.properties);

    }

    private async confirmValues(): Promise<boolean> {

        out(cyan(`O projeto será ${this.packageExisted ? 'atualizado' : 'criado'} com seguintes dados:`));
        out();
        for (const property of this.properties) {
            const name = property.name;
            const value = this.values[name];

            if (typeof value === 'string' && value) {
                out(`${name}: ${cyan(value.cyan)}`);
            }
        }
        out();
        return await this.confirm(cyan('Confirma?'));

    }

    private writePackage(): void {

        const filePath = this.PACKAGE_PATH;
        const pak = this.package;
        const values = this.values;

        for (const property of this.properties) {
            const name = property.name;
            let value = values[property.name];

            // Strings vazias = deletar propriedade
            if (typeof value === 'string' && !value) {
                delete pak[name];
                continue;
            }

            // repository requer tratamento especial
            if (name === 'repository') {
                if (!value) {
                    delete pak.repository;
                    continue;
                }
                value = {
                    type: this.isGitUrl(value) ? 'git' : 'svn',
                    url: value,
                };
            }

            pak[property.name] = value;
        }

        if (this.options.beforePackageWrite) {
            this.options.beforePackageWrite(pak);
        }

        out(`Gravando ${cyan(filePath)} ...`);

        try {
            fs.writeFileSync(filePath, JSON.stringify(pak, null, 2), { encoding: 'utf8' });
        } catch (error) {
            outErr(`Erro fatal ao gravar o arquivo ${filePath}`.red);
            throw error;
        }

    }

    private createReadme() {

        const filePath = this.README_PATH;

        out(`Gravando ${cyan(filePath)} ...`);

        try {
            let contents = `# ${this.removeProjectFromNameScope(this.package.name)}\n`;
            if (this.package.description) {
                contents += `\n${this.package.description}\n`;
            }

            fs.writeFileSync(filePath, contents, { encoding: 'utf8' });
        } catch (error) {
            outErr(error);
            outErr(`Erro não fatal ao gravar o arquivo ${filePath}`.red);
        }

    }

    private deletePaths(): void {

        const pathConfigs = this.options.delete;

        if (!pathConfigs) {
            return;
        }

        const returnTrue = () => true;

        for (const config of pathConfigs) {

            const finalPath = path.resolve(this.PROJECT_PATH, config.path);
            const condition = config.condition || returnTrue;

            if (fs.existsSync(finalPath) && condition(finalPath)) {
                try {
                    out(`Apagando ${cyan(finalPath)} ...`);
                    rimraf.sync(finalPath);
                }
                catch (error) {
                    // Forneceu um error handler?
                    if (config.onError) {
                        try {
                            config.onError(error);
                        }
                        catch (userError) {
                            outErr(userError);

                            if (config.fatal) {
                                outErr(`Erro fatal ao tentar apagar ${finalPath}`.red);
                                throw userError;
                            }

                            outErr(`Erro não fatal ao tentar apagar ${finalPath}`.red);
                            outErr('Você terá que fazê-lo manualmente.'.red);
                        }
                    }
                    else {
                        outErr(error);

                        if (config.fatal) {
                            outErr(`Erro fatal ao tentar apagar ${finalPath}`.red);
                            throw error;
                        }

                        outErr(`Erro não fatal ao tentar apagar ${finalPath}`.red);
                        outErr('Você terá que fazê-lo manualmente.'.red);
                    }
                }
            }

        }



    }

    private async initializeGit() {

        const repository = this.values[this.options.initializeGit as string];

        // Informou repositório Git?
        if (repository && this.isGitUrl(repository)) {

            out(`Você informou o seguinte repositório Git para o projeto:`);
            out();
            out(cyan(repository));
            out();

            // Já existe um repositório no projeto
            if (fs.existsSync(this.GIT_PATH)) {
                const currentRepository = execFileSync('git', ['remote', 'get-url', 'origin'], {
                    cwd: this.PROJECT_PATH,
                    stdio: 'pipe',
                    timeout: EXEC_FILE_SYNC_TIMEOUT
                }).toString().trim();

                // Repositório já é o desejado, nada a fazer
                if (currentRepository === repository) {
                    out('Entretanto, o projeto já está associado a este repositório. Nada a fazer.');
                }
                // OPS! Repositórios diferentes
                else {
                    out('Entretanto, já existe uma pasta .git no projeto associada a outro repositório:');
                    out();
                    out(cyan(currentRepository));
                    // out();
                    out('Se você deseja trocar de repositório, terá de fazer isto manualmente.');
                }
            }
            // Ok, vamos inicializar
            else {
                const updateGit = await this.confirm(cyan('Deseja inicializar o projeto com o Git?'));
                if (updateGit) {
                    out();
                    execFileSync('git', ['init'], { cwd: this.PROJECT_PATH, stdio: [0, 1, 2], timeout: EXEC_FILE_SYNC_TIMEOUT });
                    execFileSync('git', ['remote', 'add', 'origin', repository], { cwd: this.PROJECT_PATH, stdio: [0, 1, 2], timeout: EXEC_FILE_SYNC_TIMEOUT });
                }
            }
        }

    }

    private async confirm(question: string): Promise<boolean> {

        const result = await prompt.get({
            name: 'confirm',
            pattern: /^([sny]|sim|nao|não|yes|no)$/i,
            description: question,
            default: 'sim',
        });

        switch (result.confirm.toLowerCase()) {
            case `s`:
            case `y`:
            case `sim`:
            case `yes`:
                return true;
            default:
                return false;
        }

    }

    private isGitUrl(url: string): boolean {

        return /\.git$/.test(url);

    }

    private removeProjectFromNameScope(projectName: string): string {

        return projectName.replace(/^@[a-z][a-z0-9-]+\//i, '');

    }

}

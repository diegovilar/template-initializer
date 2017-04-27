/**
 *
 */

// TODO: how to make these optional?
import * as ts from 'typescript';
import * as tsconfig from 'tsconfig/dist/tsconfig';

import * as yargs from 'yargs';
import * as path from 'path';
import * as fs from 'fs';
import { Initializer, IDictionary, deleteUtils } from '.';
import { IProgramArguments, IConfig } from './abstract';

function exit(code = 0, reason?: any): void {

    if (code && reason) {
        console.error(reason);
    }

    process.exit(code);

}

function beforePackageWrite(pak: IDictionary<any>): void {

    if (pak.scripts) {
        delete pak.scripts.postinstall;
    }

}

function getInitializerConfigFile(startPath: string): string | undefined {

    startPath = path.resolve(startPath);

    if (!fs.existsSync(startPath)) {
        return undefined;
    }

    let stats = fs.lstatSync(startPath);

    if (stats.isFile()) {
        return startPath;
    }

    let configPathTs = path.resolve(startPath, 'initializer.config.ts');
    let configPathJs = path.resolve(startPath, 'initializer.config.js');

    if (fs.existsSync(configPathTs)) {
        stats = fs.lstatSync(configPathTs);
        if (stats.isFile()) {
            return configPathTs;
        }
    }

    if (fs.existsSync(configPathJs)) {
        stats = fs.lstatSync(configPathJs);
        if (stats.isFile()) {
            return configPathJs;
        }
    }

    return undefined;

}

function findTsConfig(startDir: string): string | undefined {

    return tsconfig.findSync(path.resolve(startDir)) || undefined;

}

// IIEF main function
(async (args?: string[]) => {

    try {

        const aux = yargs
            .epilog('Copyright 2017 - Diego Vilar (https://github.com/diegovilar)')
            .usage('Usage: template-initializer [options] <config-path>')
            .alias('p', 'project')
                .describe('p', 'The tsconfig.json project to use, if the config file is in TypeScript')
            .alias('h', 'help')
            .help('h');

        const ARGV: IProgramArguments = args ? aux.parse(args) : aux.argv;
        let projectDirectory = path.resolve('.');
        let configPath: string | undefined = ARGV._[0];

        if (!configPath) {
            configPath = '.';
        }

        configPath = path.resolve(configPath);
        const originalConfigPath = configPath;
        configPath = getInitializerConfigFile(configPath);

        console.info(`originalConfigPath = ${originalConfigPath}`);
        console.info(`configPath = ${configPath}`);

        if (!configPath) {
            throw new Error(`Could not find the configuration file: ${originalConfigPath}`);
        }

        // Is it in TypeScript?
        if (path.extname(configPath) === '.ts') {
            require('ts-node').register({
                project: findTsConfig(path.dirname(configPath))
            });
        }

        const config: IConfig = require(configPath);

        if (!config.options) {
            throw new Error('The initializer config file must export an "options" object.');
        }

        const pc = new Initializer(config.options, config.properties);
        await pc.start();
        exit(0);
    }
    catch (reason) {
        exit(1, reason);
    }

})();

/**
 *
 */

import { IDictionary } from './dictionary';

export interface IInitializerOptions {
    projectPath: string;
    beforePackageWrite?: (packageObject: IDictionary<any>) => void;
    createReadme?: boolean;
    readmeTemplate?: string;
    banner?: string | string[];
    delete?: Array<{ path: string, condition?: (path: string) => boolean, fatal?: boolean; onError?: (reason: any) => void }>;
    initializeGit?: boolean | string;
}

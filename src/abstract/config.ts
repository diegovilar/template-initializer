/**
 *
 */

import { IInitializerOptions } from './initializer-options';
import { ISchemaProperties } from './prompt';

export interface IConfig {
    options: IInitializerOptions;
    properties?: ISchemaProperties[];
}

/**
 *
 */
export type TRevalidatorFormat =
    'url' |
    'email' |
    'ip-address' |
    'ipv6' |
    'date-time' |
    'date' |
    'time' |
    'color' |
    'host-name' |
    'utc-milisec' |
    'regex';

export interface ISchemaProperties {
    name: string;
    description?: string;
    type?: 'string' | 'boolean' | 'number' | 'integer' | 'array';
    maxItems?: number;
    minItems?: number;
    pattern?: RegExp;
    format?: TRevalidatorFormat;
    message?: string;
    hidden?: boolean;
    replace?: string;
    required?: boolean;
    allowEmpty?: boolean;
    maxLength?: number;
    minLength?: number;
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    uniqueItems?: boolean;
    enum?: any[];
    divisibleBy?: number;
    dependencies?: string | string[] | { [key: string]: any };
    default?: any;
    before?: (value: any) => any;
    conform?: (value: any) => boolean;
    ask?: () => boolean;
}

export interface ISchema {

    properties: ISchemaProperties;

}

export interface IPromisedPrompt {
    message: string;
    delimiter: string;
    colors: boolean;
    override: { [key: string]: string };
    start(options?: { noHandleSIGINT: boolean }): void;
    stop(): void;
    history(name: string): { value: any };
    history<T>(name: string): { value: T };
    get(schema: ISchemaProperties | ISchemaProperties[] | ISchema | string | string[]): Promise<any>;
    get<T>(schema: ISchemaProperties | ISchemaProperties[] | ISchema | string | string[]): Promise<T>;
}

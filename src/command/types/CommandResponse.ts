import Debug from "debug";
export class CommandResponse {
    success: boolean;
    message: string;
    data: any;
    error?: string;

    constructor(success: boolean, message: string, data: any = null, error: string | undefined = undefined) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.error = error;
    }
}

export abstract class CommandResponse {
    success: boolean;
    message: string;
    data?: any;
    error?: string;

    constructor(success: boolean, message: string, data: any = null, error: string = null) {
        if (new.target === CommandResponse) {
            throw new Error("Abstract class CommandResponse cannot be instantiated directly.");
        }
        this.success = success;
        this.message = message;
        this.data = data;
        this.error = error;
    }

    isSuccess(): boolean {
        return this.success;
    }

    getMessage(): string {
        return this.message;
    }

    getData(): any {
        return this.data;
    }

    getError(): string | undefined {
        return this.error;
    }
}

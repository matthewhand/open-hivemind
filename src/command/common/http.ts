import Debug from "debug";
export abstract class HTTPCommand {
    abstract executeRequest(args: any): Promise<{ success: boolean, message: string, error?: string }>; 
}

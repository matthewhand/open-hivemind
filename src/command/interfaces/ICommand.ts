import Debug from "debug";
export default interface ICommand {
    name: string;
    description: string;
    allowedRoles?: string[];
    execute(args: any): Promise<{ success: boolean, message: string, error?: string }>;
}

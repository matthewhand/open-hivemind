declare module '@discordjs/builders' {
  export class SlashCommandBuilder {
    setName(name: string): this;
    setDescription(description: string): this;
    addStringOption(option: any): this;
    addBooleanOption(option: any): this;
    addIntegerOption(option: any): this;
    addNumberOption(option: any): this;
    addUserOption(option: any): this;
    addChannelOption(option: any): this;
    addRoleOption(option: any): this;
    addMentionableOption(option: any): this;
    addAttachmentOption(option: any): this;
    toJSON(): any;
  }

  export class EmbedBuilder {
    setTitle(title: string): this;
    setDescription(description: string): this;
    setColor(color: number): this;
    setTimestamp(timestamp?: Date): this;
    setFooter(options: { text: string; iconURL?: string }): this;
    setAuthor(options: { name: string; iconURL?: string; url?: string }): this;
    addFields(...fields: { name: string; value: string; inline?: boolean }[]): this;
    setImage(url: string): this;
    setThumbnail(url: string): this;
    toJSON(): any;
  }
}
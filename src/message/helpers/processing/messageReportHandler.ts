import { IMessengerService } from '@src/message/interfaces/IMessengerService';
/**
 * Sends a report to a specified report channel using IMessengerService.
 * This will be used for features like summarization or other reporting needs.
 * 
 * @param messengerService - The IMessengerService to handle the report.
 * @param reportChannelId - The ID of the channel where the report should be sent.
 * @param reportContent - The report content to send.
 */
export const sendReport = async (
  messengerService: IMessengerService,
  reportChannelId: string,
  reportContent: string
): Promise<void> => {
  await messengerService.sendMessageToChannel(reportChannelId, reportContent);  // Send report to the specified channel
};

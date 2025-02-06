export interface InteractiveActionHandlers {
    sendCourseInfo: (channel: string) => Promise<void>;
    sendBookingInstructions: (channel: string) => Promise<void>;
    sendStudyResources: (channel: string) => Promise<void>;
    sendAskQuestionModal: (triggerId: string) => Promise<void>;
    sendInteractiveHelpMessage: (defaultChannel: string, userId: string) => Promise<void>;
  }
  
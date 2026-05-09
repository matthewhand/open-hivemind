import sys

def remove_getChannels_from_slack():
    file_path = 'packages/message-slack/src/SlackService.ts'
    with open(file_path, 'r') as f:
        lines = f.readlines()

    with open(file_path, 'w') as f:
        for line in lines:
            if "getChannels: async (botName?: string) => this.getChannels(botName || name)," in line:
                continue
            f.write(line)

def remove_getChannels_from_mattermost():
    file_path = 'packages/message-mattermost/src/MattermostService.ts'
    with open(file_path, 'r') as f:
        lines = f.readlines()

    with open(file_path, 'w') as f:
        for line in lines:
            if "getChannels: async (botName?: string) => this.getChannels(botName || name)," in line:
                continue
            f.write(line)

if __name__ == '__main__':
    remove_getChannels_from_slack()
    remove_getChannels_from_mattermost()

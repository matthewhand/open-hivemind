
# Commands Directory README
This directory contains the command files for the Discord bot. Each command is implemented as a separate file, and this document provides an overview of each command.
## List of Commands
- `/user`: Retrieves user information.
- `/server`: Retrieves server information.
- `/query`: Queries an HTTP endpoint defined by the `QUERY_URL` environment variable.
- `/botlog`: Responds with the last 10 lines from 'bot.log'.
## Command Details
### `/user`
The `/user` command retrieves information about the user who issued the command. It returns details such as the username, discriminator, and avatar URL.
### `/server`
The `/server` command retrieves information about the server where the command was issued. It returns details such as the server name, member count, and server owner.
### `/query`
The `/query` command allows users to query an HTTP endpoint defined by the `QUERY_URL` environment variable. The response from the endpoint is sent back to the user in the Discord channel.
### `/botlog`
The `/botlog` command responds with the last 10 lines from the 'bot.log' file. It allows users to quickly check the recent activity and status of the bot.

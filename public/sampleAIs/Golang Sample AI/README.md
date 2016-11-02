# Bomberman AI

A bot to play a flavor of bomberman in the AI Competition held by Upsilon Pi Epsilon at RPI.

Currently, all the bot can do is place a bomb and wait for it to explode, killing itself and ending
the game.

To run the bot, first create a credential file (*.key) in the root directory with the contents:
```
<dev key>
<username>
```

Then build and run:
```bash
go build ai.go suicide.go && ai.exe <key_file>
```

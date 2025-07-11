# Character Fetcher
source code to the Character Fetcher bot that fetches many different things!

To use the code you must first setup your config,
Create config.json
```json
{
  "token": "[Discord Bot Token]",
  "danbooru": {
    "usr": "[Danbooru Username]",
    "key": "[Danbooru API key]"
  },
  "gelbooru": {
    "usr": "[Gelbooru Username]",
    "key": "[Gelbooru API Key]"
  },
  "pixiv": {
    "cookie": "[Pixiv Cookie]"
  },
  "db": {
    "address": "127.0.0.1",
    "port": 3306,
    "user": "[DB Username]",
    "pass": "[DB Password]",
    "db": "[Name of DB]"
  }
}
```
The pixiv cookie is the literal cookie/header that would be used pixiv.net, e.g. `PHPSESSID=whatever; device_id=whatever;`, it's also recommended to change the user agent here: https://github.com/win10Device/character-fetch/blob/dd5ce40f03a0248a6971fdcbcc64939ef19a9cd0/module/fetchers.js#L124
https://github.com/win10Device/character-fetch/blob/dd5ce40f03a0248a6971fdcbcc64939ef19a9cd0/index.js#L91
To the same one as where the pixiv cookie was made.


<sub>Discord bot invite&emsp;&emsp;&emsp;&nbsp;https://mint.ranrom.net/fetch/bot/</sub><br>
<sub>Discord user bot invite&emsp;&nbsp;https://mint.ranrom.net/fetch/bot/user</sub><br>
<sub>Terms of Service&emsp;&emsp;&emsp;&emsp;https://mint.ranrom.net/fetch/terms</sub><br>
<sub>Privacy Polciy&emsp;&emsp;&emsp;&emsp;&emsp;&nbsp;https://mint.ranrom.net/fetch/privacy</sub><br>

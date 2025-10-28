# bachelor Simulator

## About

Technically a random event driven text-based game.

Random events are defined in [YAML files](static/rulesets/default). Therefore,
the game is easily moddable,

Not actively maintained.

## Build and Play Locally

After cloning the repository and running `npm install`, run

```
npm run build && npm start
```

and then navigate to http://localhost:8000 in your browser. Built bundle will be
outputted to the `dist` directory.

> [!NOTE] 
> The rulesets in this repo can be different from the online version hosted on
> my website.


## Credits

This project is based on the open-source project by [Mianzhi Wang](https://github.com/morriswmz/phd-game),
licensed under the [MIT License](https://github.com/morriswmz/phd-game/blob/master/LICENSE).

Original Copyright (c) 2018 Mianzhi Wang  
Modifications and extensions are made for educational and research purposes.
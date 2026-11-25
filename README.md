# Wald-Leiternspiel

Ein Leiternspiel für unsere Forschungsfrage:
**Was würde mit der Wirtschaft und Gesellschaft passieren, wenn es keinen Wald mehr in Deutschland gäbe?**

Es geht nur um den Deutschen Wald. Statt zu würfeln beantwortet man Fragekarten.

Spielen: https://248games.github.io/WaldSpiel/

Ohne Internet: den Ordner herunterladen und `index.html` öffnen.

## Regeln

- 2 bis 4 Spieler an einem Gerät. Alle starten auf Feld 1.
- Beim Eintragen steht der jüngste Spieler oben, darunter immer der Spieler links daneben.
- Der jüngste Spieler zieht eine Karte und liest Frage, Antworten und Punktzahl vor.
  Der Spieler links von ihm antwortet.
- Richtig: so viele Felder vor, wie Punkte auf der Karte stehen. Falsch: stehen bleiben.
- Dann liest der vor, der gerade geantwortet hat, und der Nächste antwortet.
- Leitern: Wer unten landet, steigt hinauf (das gibt uns der Wald).
  Wer oben landet, muss hinunter (das passiert ohne Wald).
- Wer zuerst Feld 36 erreicht, gewinnt. Man muss nicht genau treffen.

Es gibt 60 Karten mit 1 bis 6 Punkten (jede Zahl 10-mal). Der Stapel wird erst neu
gemischt, wenn alle Karten dran waren. Ein Spiel zu zweit dauert meistens 15 bis 30 Fragen.

## Fragen ändern

Alle Fragen und Texte stehen in `js/content.js`. Die erste Antwort ist immer die
richtige, das Spiel mischt sie selbst. Danach mit `npm test` prüfen (braucht Node.js).

Die KI-Prompts, die wir genutzt haben, stehen im Spiel unter „KI-Prompts“.
Neue Prompts trägt man in `js/content.js` bei `AI_PROMPTS` ein.

Bei jedem Push auf `main` wird das Spiel automatisch getestet und online gestellt
(`.github/workflows/pages.yml`).

## Dateien

- `index.html`, `style.css`: Seite und Aussehen
- `js/content.js`: Fragen und Texte
- `js/game.js`: Spielregeln
- `js/app.js`: Brett, Karten und Dialoge
- `test/`: Tests
- `fonts/`: Schriften

## Quellen

- Thünen-Institut: [Bundeswaldinventur 2022](https://www.bundeswaldinventur.de) und
  [Pressemitteilung vom 8.10.2024](https://thuenen.de/media/ti/Newsroom/Presse/Pressemitteilungen/2024/2024-10-08_Bundeswaldinventur_2022/2024-10-08_PM_BWI.pdf)
- Thünen-Institut: [Clusterstatistik Forst und Holz 2020](https://www.thuenen.de/media/institute/wf/HM_div._Statistik_Dateien/Dateien_-_Bilanzen_-_Tabellen/Produktion_Verwendung/Clusterstatistik/de_Clusterstatistik_Deutschland.pdf)
- Statistisches Bundesamt: [Holzeinschlag 2024](https://www.waldwissen.net/de/waldwirtschaft/holz-und-markt/holzmarkt/holzeinschlag-2024)
- Umweltbundesamt: [Erneuerbare Energien in Zahlen](https://www.umweltbundesamt.de/themen/klima-energie/erneuerbare-energien/erneuerbare-energien-in-zahlen)
- Schutzgemeinschaft Deutscher Wald: [Wald und Wasser](https://sdw.de/fileadmin/Bundesverband/07_Presse/Presseinformationen/240318_Tag_des_Wassers_Wald_und_Wasser.pdf)
- Deutscher Alpenverein: [40 Jahre Aktion Schutzwald](https://www.alpenverein.de/40-jahre-schutzwald)
- [Bundeswaldgesetz](https://www.gesetze-im-internet.de/bwaldg/), §§ 1 und 14
- Deutsches Zentrum für Luft- und Raumfahrt (2022): Baumverluste 2018 bis 2021
- Elsasser und Weller (Thünen-Institut, 2013): Befragung zu Waldbesuchen

Manche Zahlen sind gerundet oder kommen von Verbänden (z. B. 200 Liter Wasser pro
Quadratmeter Waldboden, 50 Tonnen Staub pro Hektar).

Schriften: Alfa Slab One und Lexend (SIL Open Font License, siehe `fonts/`).

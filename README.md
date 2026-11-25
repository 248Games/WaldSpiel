# Wald-Leiternspiel

Ein digitales Leiternspiel zur Forschungsfrage

> Was würde mit der Wirtschaft und Gesellschaft passieren, wenn es keinen Wald
> mehr in Deutschland gäbe?

Das Spiel bezieht sich ausschließlich auf den Deutschen Wald. Statt zu würfeln
beantwortet man Fragekarten. Es spielt sich wie die gedruckte Version.

**Online spielen:** <https://248games.github.io/WaldSpiel/>

## Starten

Den Link oben öffnen, am Handy, Tablet oder Computer. Es muss nichts
installiert werden.

Ohne Internet geht es auch: den ganzen Ordner herunterladen und `index.html`
doppelt anklicken. Dabei den ganzen Ordner weitergeben, nicht nur die
`index.html`.

## Spielanleitung

**Vorbereitung.** 2 bis 4 Spieler spielen an einem Gerät. Jeder bekommt eine
Spielfigur, alle starten auf Feld 1. Beim Eintragen der Namen steht der
jüngste Spieler oben, darunter immer der Spieler links daneben. Die
Fragekarten liegen gemischt und verdeckt als Stapel bereit.

**Spielablauf.** Der jüngste Spieler beginnt und zieht eine Karte. Er liest
die Frage, die Antworten und die Punktzahl laut vor. Der Spieler links von ihm
muss die Frage beantworten. Seine Antwort wird angetippt.

- Richtige Antwort: Er darf so viele Felder vorrücken, wie Punkte auf der
  Karte stehen.
- Falsche Antwort: Er muss stehen bleiben.

Danach ist der nächste Spieler mit dem Vorlesen an der Reihe: Wer gerade
geantwortet hat, liest die nächste Karte dem Spieler links von sich vor. Das
Spiel zeigt immer an, wer vorliest und wer antwortet.

**Besonderheit: Leitern.** Landet ein Spieler am unteren Ende einer Leiter,
steigt er hinauf. Landet er am oberen Ende, muss er hinunter. Jede Leiter
erzählt dabei zwei Seiten: Hinauf zeigt, was uns der Wald gibt (zum Beispiel
„Aufforstung“). Hinunter zeigt, was ohne Wald passieren würde (zum Beispiel
„Kahlschlag“). Kein Feld gehört zu zwei Leitern, es gibt also keine
Kettenreaktion.

**Spielende.** Wer als Erster das Ziel auf Feld 36 erreicht, gewinnt. Dafür
muss man nicht genau auf dem Ziel landen. Am Ende steht die Antwort auf die
Forschungsfrage (auch jederzeit über „Fazit“).

Der Stapel hat 60 Karten. Er wird ganz durchgespielt und erst dann neu
gemischt, auch über mehrere Spiele hinweg („Noch ein Spiel“).

## Wie lange dauert ein Spiel?

Gezählt sind alle Fragen eines Spiels zusammen (Simulation mit je 3000 Spielen):

| Spieler | 3 von 4 Antworten richtig   | 6 von 10 richtig            |
| ------- | --------------------------- | --------------------------- |
| 2       | meist 18 Fragen (11 bis 30) | meist 22 Fragen (13 bis 38) |
| 3       | meist 23 Fragen (15 bis 37) | meist 29 Fragen (18 bis 46) |
| 4       | meist 29 Fragen (18 bis 43) | meist 36 Fragen (22 bis 54) |

In Klammern: Diese Spanne trifft auf 4 von 5 Spielen zu.

## Fragen ändern oder ergänzen

Alle Texte stehen in [`js/content.js`](js/content.js): die 60 Fragekarten, die
Texte der Leitern (hinauf und hinunter), das Fazit und die Quellen. Oben in der
Datei steht, wie eine Karte aufgebaut ist. Wichtig:

- **Die erste Antwort ist immer die richtige.** Das Spiel mischt die
  Reihenfolge selbst.
- Jede Karte hat feste Punkte (`points`) von 1 bis 6: leichte Fragen 1 oder 2,
  mittlere 3 oder 4, schwere 5 oder 6. Jede Punktzahl kommt gleich oft vor
  (je 10-mal), so wie die Seiten eines Würfels.

Danach die Tests laufen lassen (dafür braucht man [Node.js](https://nodejs.org)):

```
npm test
```

Die Tests prüfen die Regeln (Leitern hinauf und hinunter, keine
Kettenreaktion, Ziehen und Mischen des Stapels, Vorlesen und Antworten,
Spielende), die Spieldauer und ob jede Karte Punkte, eine Erklärung und drei
oder vier verschiedene Antworten hat. Beim Veröffentlichen laufen sie auch
automatisch: Schlägt ein Test fehl, wird die Seite nicht aktualisiert.

## Veröffentlichen

Bei jedem Push auf `main` stellt der Workflow
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) das Spiel über
GitHub Pages online. Danach ruft er die Seite ab und prüft, ob dort wirklich die
neue Version ankommt.

Einmalig nötig: in GitHub unter **Settings → Pages** bei **Source** „GitHub
Actions“ wählen. Das Feld **Custom domain** bleibt leer.

## Aufbau

```
index.html      Die Seite
style.css       Aussehen, hell und dunkel
js/content.js   Alle Texte und Fragen
js/game.js      Die Spielregeln, ohne Bildschirm – dadurch testbar
js/app.js       Brett, Stapel, Dialoge und Animation
fonts/          Schriften, damit das Spiel ohne Internet gleich aussieht
test/           Die Tests (npm test)
```

Die Regeln in `game.js` sind reine Funktionen über einem Spielstand, der sich
als JSON speichern lässt. Deshalb übersteht ein Spiel auch das Neuladen der
Seite.

## Quellen der Zahlen

- Thünen-Institut: [Bundeswaldinventur 2022](https://www.bundeswaldinventur.de)
  und [Pressemitteilung vom 8.10.2024](https://thuenen.de/media/ti/Newsroom/Presse/Pressemitteilungen/2024/2024-10-08_Bundeswaldinventur_2022/2024-10-08_PM_BWI.pdf)
  – Waldfläche, Baumarten, Alter, Kohlenstoff
- Thünen-Institut: [Clusterstatistik Forst und Holz 2020](https://www.thuenen.de/media/institute/wf/HM_div._Statistik_Dateien/Dateien_-_Bilanzen_-_Tabellen/Produktion_Verwendung/Clusterstatistik/de_Clusterstatistik_Deutschland.pdf)
  – Beschäftigte, Umsatz, Unternehmen
- Statistisches Bundesamt: [Holzeinschlag 2024](https://www.waldwissen.net/de/waldwirtschaft/holz-und-markt/holzmarkt/holzeinschlag-2024)
- Umweltbundesamt: [Erneuerbare Energien in Zahlen](https://www.umweltbundesamt.de/themen/klima-energie/erneuerbare-energien/erneuerbare-energien-in-zahlen)
  – Holz als Wärmequelle
- Schutzgemeinschaft Deutscher Wald: [Wald und Wasser](https://sdw.de/fileadmin/Bundesverband/07_Presse/Presseinformationen/240318_Tag_des_Wassers_Wald_und_Wasser.pdf)
  – Wasserspeicher, Wasserschutzgebiete, Luftfilter
- Deutscher Alpenverein: [40 Jahre Aktion Schutzwald](https://www.alpenverein.de/40-jahre-schutzwald)
- [Bundeswaldgesetz](https://www.gesetze-im-internet.de/bwaldg/), §§ 1 und 14
- Deutsches Zentrum für Luft- und Raumfahrt (2022): Baumverluste 2018 bis 2021
- Elsasser und Weller (Thünen-Institut, 2013): Befragung zu Waldbesuchen

Einige Zahlen sind gerundet, und manche stammen von Verbänden statt aus
amtlichen Statistiken (zum Beispiel die 200 Liter Wasser je Quadratmeter
Waldboden und die 50 Tonnen Staub je Hektar). Für eine Arbeit, die benotet
wird, lohnt sich ein Blick in die Originalquelle.

## Schriften

[Alfa Slab One](fonts/OFL-AlfaSlabOne.txt) und [Lexend](fonts/OFL-Lexend.txt),
beide unter der SIL Open Font License.

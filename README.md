# Wald-Leiternspiel

Ein digitales Leiternspiel zur Forschungsfrage

> Was würde mit der Wirtschaft und Gesellschaft passieren, wenn es keinen Wald
> mehr in Deutschland gäbe?

Statt zu würfeln beantwortet man Fragen. Wer richtig antwortet, rückt vor.
Leitern zeigen, was der Wald uns gibt. Rutschen zeigen, was ohne Wald passieren
würde.

## Starten

Doppelklick auf `index.html` – das Spiel öffnet sich im Browser. Es braucht
kein Internet und keine Installation.

Zum Weitergeben den ganzen Ordner `leiternspiel` kopieren, nicht nur die
`index.html`.

## Regeln

- 1 bis 4 Spieler oder Teams. Alle starten auf Feld 1, wer zuerst Feld 49
  erreicht, gewinnt.
- Wer dran ist, wählt eine von drei Fragekarten: **leicht** (1–2 Felder),
  **mittel** (3–4 Felder) oder **schwer** (5–6 Felder). Zusammen sind das die
  sechs Seiten eines Würfels.
- Richtige Antwort: so viele Felder vorrücken, wie auf der Karte steht.
  Falsche Antwort: stehen bleiben.
- Das Brett zeigt vor der Wahl, wohin jede Karte führt. Man kann also gezielt
  eine Leiter ansteuern oder einer Rutsche ausweichen.
- Am Fuß einer Leiter klettert man hoch, am Anfang einer Rutsche rutscht man
  zurück.
- Nach jeder Antwort erklärt das Spiel kurz, warum sie stimmt. Am Ende steht
  die Antwort auf die Forschungsfrage (auch jederzeit über „Fazit“).

Eine Partie zu zweit braucht meist 15 bis 30 Fragen, zu viert 25 bis 45.

## Fragen ändern oder ergänzen

Alle Texte stehen in [`js/content.js`](js/content.js): die 60 Fragen, die Texte
der Leitern und Rutschen, das Fazit und die Quellen. Oben in der Datei steht,
wie eine Frage aufgebaut ist. Wichtig: **Die erste Antwort ist immer die
richtige** – das Spiel mischt die Reihenfolge selbst.

Danach `npm test` ausführen (im Spielordner des ursprünglichen Repos). Die Tests prüfen unter anderem, ob
jede Frage eine Erklärung, drei oder vier verschiedene Antworten und einen
eindeutigen Namen hat.

## Aufbau

```
index.html      Die Seite
style.css       Aussehen, hell und dunkel
js/content.js   Alle Texte und Fragen
js/game.js      Die Spielregeln, ohne Bildschirm – dadurch testbar
js/app.js       Brett, Karten, Dialoge und Animation
fonts/          Schriften, damit das Spiel ohne Internet gleich aussieht
```

Die Regeln in `game.js` sind reine Funktionen über einem Spielstand, der sich
als JSON speichern lässt. Deshalb übersteht eine Partie auch das Neuladen der
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

/*
 * Wald-Leiternspiel: alle Texte und Fragen
 *
 * Neue Fragen oder andere Texte nur hier ändern.
 * Alle Fragen sind über den Deutschen Wald.
 *
 * So ist eine Frage (eine Karte) aufgebaut:
 *
 *   {
 *     id: 'e21',                    // eindeutiger Name, darf nur einmal vorkommen
 *     points: 2,                    // Punkte auf der Karte = so viele Felder darf man vor
 *                                   // leicht: 1 oder 2, mittel: 3 oder 4, schwer: 5 oder 6
 *     topic: 'economy',             // 'economy' = Wirtschaft, 'society' = Gesellschaft,
 *                                   // 'environment' = Umwelt
 *     question: 'Die Frage?',
 *     answers: ['richtig', 'falsch', 'falsch'],   // DIE ERSTE ANTWORT IST IMMER DIE RICHTIGE
 *     explanation: 'Ein bis zwei Sätze, warum das stimmt.',
 *   }
 *
 * Jede Punktzahl von 1 bis 6 kommt gleich oft vor (je 10-mal), wie bei einem Würfel.
 * Die Antworten werden im Spiel gemischt.
 */
(function (global) {
  'use strict';

  const RESEARCH_QUESTION =
    'Was würde mit der Wirtschaft und Gesellschaft passieren, wenn es keinen Wald mehr in Deutschland gäbe?';

  const TOPIC_LABELS = { economy: 'Wirtschaft', society: 'Gesellschaft', environment: 'Umwelt' };

  const QUESTIONS = [
    // Leicht: 1 oder 2 Punkte
    {
      id: 'e01',
      points: 2,
      topic: 'environment',
      question: 'Wie viel von Deutschlands Fläche ist mit Wald bedeckt?',
      answers: ['Etwa ein Drittel', 'Etwa ein Zehntel', 'Mehr als zwei Drittel'],
      explanation:
        'Deutschland hat rund 11,5 Millionen Hektar Wald. Das sind 32 Prozent der Landesfläche.',
    },
    {
      id: 'e02',
      points: 1,
      topic: 'economy',
      question: 'Welches dieser Dinge wird aus Holz hergestellt?',
      answers: ['Papier', 'Glas', 'Beton'],
      explanation:
        'Aus Holz werden Papier, Möbel, Häuser, Kartons und Stifte gemacht. Ohne eigenen Wald müsste Deutschland dieses Holz im Ausland kaufen.',
    },
    {
      id: 'e03',
      points: 1,
      topic: 'environment',
      question: 'Was geben Bäume an die Luft ab, das wir zum Atmen brauchen?',
      answers: ['Sauerstoff', 'Kohlendioxid', 'Ruß'],
      explanation:
        'Bei der Fotosynthese nehmen Bäume Kohlendioxid auf und geben Sauerstoff ab. Im deutschen Wald stehen rund 90 Milliarden Bäume.',
    },
    {
      id: 'e04',
      points: 2,
      topic: 'society',
      question: 'Darf in Deutschland jeder zur Erholung in den Wald gehen?',
      answers: [
        'Ja, das erlaubt das Gesetz – auch im Privatwald',
        'Nein, nur mit Erlaubnis des Besitzers',
        'Nur an Sonn- und Feiertagen',
      ],
      explanation:
        'Das Betretungsrecht steht im Bundeswaldgesetz. Der Wald ist damit ein Erholungsort für alle – auch für Menschen ohne eigenen Garten.',
    },
    {
      id: 'e05',
      points: 1,
      topic: 'economy',
      question: 'Welcher Beruf hängt direkt vom Wald ab?',
      answers: ['Försterin', 'Bäckerin', 'Pilotin'],
      explanation:
        'Auch Forstwirte, Schreinerinnen, Zimmerer und die Beschäftigten in Sägewerken und Papierfabriken brauchen den Wald.',
    },
    {
      id: 'e06',
      points: 2,
      topic: 'environment',
      question: 'Was passiert bei starkem Regen mit dem Wasser im Wald?',
      answers: [
        'Der Waldboden saugt viel davon auf wie ein Schwamm',
        'Alles fließt sofort in den nächsten Fluss',
        'Der Boden lässt gar kein Wasser hinein',
      ],
      explanation:
        'Unter einem Quadratmeter Waldboden können bis zu 200 Liter Wasser gespeichert sein. Ohne Wald fließt Regen schneller ab, und die Hochwassergefahr steigt.',
    },
    {
      id: 'e07',
      points: 1,
      topic: 'society',
      question: 'Wie ist es an einem heißen Sommertag im Wald?',
      answers: ['Kühler als in der Stadt', 'Heißer als in der Stadt', 'Genauso heiß wie in der Stadt'],
      explanation:
        'Bäume spenden Schatten und verdunsten Wasser. Im Wald ist es im Sommer oft mehrere Grad kühler.',
    },
    {
      id: 'e08',
      points: 2,
      topic: 'environment',
      question: 'Welches Gas nehmen Bäume aus der Luft auf und speichern es als Kohlenstoff im Holz?',
      answers: ['Kohlendioxid (CO₂)', 'Sauerstoff', 'Helium'],
      explanation:
        'Bäume binden CO₂ und bremsen so den Klimawandel. Verschwände der deutsche Wald, würde dieser Kohlenstoff wieder in die Luft gelangen.',
    },
    {
      id: 'e09',
      points: 1,
      topic: 'society',
      question: 'Welches Märchen spielt im Wald?',
      answers: ['Hänsel und Gretel', 'Die Prinzessin auf der Erbse', 'Des Kaisers neue Kleider'],
      explanation:
        'Hänsel und Gretel stammt aus der Sammlung der Brüder Grimm. In vielen deutschen Märchen ist der Wald ein wichtiger Ort. Er gehört zu unserer Kultur.',
    },
    {
      id: 'e10',
      points: 1,
      topic: 'economy',
      question: 'Deutschland hat keinen Wald mehr, braucht aber weiter Holz. Was nun?',
      answers: [
        'Holz aus anderen Ländern einführen',
        'Holz in Fabriken künstlich herstellen',
        'Nichts – Holz wird kaum gebraucht',
      ],
      explanation:
        'Deutschland müsste sein gesamtes Holz importieren. Das macht abhängig von anderen Ländern und wegen der langen Transportwege teurer.',
    },
    {
      id: 'e11',
      points: 1,
      topic: 'environment',
      question: 'Was hält an einem steilen Hang den Boden fest?',
      answers: ['Die Wurzeln der Bäume', 'Der Wind', 'Das Sonnenlicht'],
      explanation:
        'Wurzeln wirken wie ein Netz im Boden. Ohne Wald würde Regen in den Alpen und Mittelgebirgen die Erde wegspülen, und Hänge würden leichter abrutschen.',
    },
    {
      id: 'e12',
      points: 2,
      topic: 'society',
      question: 'Was filtern Wälder aus der Luft?',
      answers: ['Staub und Ruß', 'Sauerstoff', 'Wolken'],
      explanation:
        'Blätter und Nadeln fangen Staub und Ruß ab. Ohne Wald wäre die Luft schmutziger – schlecht für die Gesundheit.',
    },
    {
      id: 'e13',
      points: 2,
      topic: 'economy',
      question: 'Warum heißt Holz „nachwachsender Rohstoff“?',
      answers: ['Weil neue Bäume nachwachsen', 'Weil Holz niemals kaputtgeht', 'Weil man es aus Erdöl herstellt'],
      explanation:
        'Wird nur so viel geerntet, wie nachwächst, reicht das Holz für immer. Erdöl, Kohle und Erz wachsen dagegen nicht nach.',
    },
    {
      id: 'e14',
      points: 1,
      topic: 'environment',
      question: 'Für wen ist der Wald ein Zuhause?',
      answers: [
        'Für tausende Arten von Tieren, Pflanzen und Pilzen',
        'Nur für Vögel',
        'Für fast keine Lebewesen',
      ],
      explanation:
        'Specht, Wildkatze, Feuersalamander, Hirschkäfer und viele Pilze leben im Wald. Ohne Wald verlieren sie ihren Lebensraum.',
    },
    {
      id: 'e15',
      points: 2,
      topic: 'economy',
      question: 'Womit verdienen Waldbesitzer hauptsächlich Geld?',
      answers: ['Mit dem Verkauf von Holz', 'Mit dem Verkauf von Laub', 'Mit Eintrittskarten für den Wald'],
      explanation:
        'Holz ist die wichtigste Einnahmequelle der Forstbetriebe. Eintritt kostet der Wald in Deutschland nicht.',
    },
    {
      id: 'e16',
      points: 1,
      topic: 'society',
      question: 'Wovor schützt ein Waldstreifen zwischen Autobahn und Wohngebiet?',
      answers: ['Vor Lärm und Abgasen', 'Vor Erdbeben', 'Vor Gewittern'],
      explanation:
        'Bäume dämpfen Lärm und fangen Schadstoffe ab. Davon profitieren alle, die in der Nähe wohnen.',
    },
    {
      id: 'e17',
      points: 2,
      topic: 'environment',
      question: 'Was ist ein Mischwald?',
      answers: ['Ein Wald mit verschiedenen Baumarten', 'Ein Wald nur aus Fichten', 'Ein Wald mit Wiesen und Äckern'],
      explanation:
        'Mischwälder aus Laub- und Nadelbäumen halten Dürre, Sturm und Borkenkäfer besser aus als Wälder mit nur einer Baumart.',
    },
    {
      id: 'e18',
      points: 2,
      topic: 'society',
      question: 'Was bedeutet die Redewendung „auf dem Holzweg sein“?',
      answers: ['Sich irren', 'Im Wald spazieren gehen', 'Holz transportieren'],
      explanation:
        'Holzwege dienten nur dem Abtransport von Holz und endeten mitten im Wald. Solche Redewendungen zeigen, wie fest der Wald zu unserer Sprache gehört.',
    },
    {
      id: 'e19',
      points: 1,
      topic: 'economy',
      question: 'Welche Urlaubsregion lebt von Gästen, die wegen des Waldes kommen?',
      answers: ['Der Schwarzwald', 'Die Insel Helgoland', 'Der Hamburger Hafen'],
      explanation:
        'Schwarzwald, Bayerischer Wald, Harz und Thüringer Wald leben vom Wandertourismus. Ohne Wald kämen weniger Gäste in Hotels und Gaststätten.',
    },
    {
      id: 'e20',
      points: 2,
      topic: 'economy',
      question: 'Womit heizen Haushalte mit Kaminofen oder Pelletheizung?',
      answers: ['Mit Holz', 'Mit Sand', 'Mit Meerwasser'],
      explanation:
        'Scheitholz, Pellets und Hackschnitzel stammen aus dem Wald. Ohne Wald bräuchten diese Haushalte eine andere Heizung.',
    },

    // Mittel: 3 oder 4 Punkte
    {
      id: 'm01',
      points: 4,
      topic: 'economy',
      question: 'Wie viele Menschen arbeiten in Deutschland in der Forst- und Holzwirtschaft?',
      answers: ['Rund 1 Million', 'Rund 100.000', 'Rund 10.000'],
      explanation:
        'Laut Thünen-Institut sind es gut 1 Million Beschäftigte – im Wald, in Sägewerken, im Möbelbau und in der Papierindustrie. Diese Arbeitsplätze wären ohne Wald in Gefahr.',
    },
    {
      id: 'm02',
      points: 4,
      topic: 'economy',
      question: 'Wem gehört fast die Hälfte des deutschen Waldes?',
      answers: ['Privatleuten', 'Dem Bund', 'Der Europäischen Union'],
      explanation:
        '48 Prozent sind Privatwald, verteilt auf rund zwei Millionen Besitzerinnen und Besitzer. Der Rest gehört Ländern, Gemeinden und dem Bund.',
    },
    {
      id: 'm03',
      points: 3,
      topic: 'society',
      question: 'Warum liegen so viele Wasserschutzgebiete im Wald?',
      answers: [
        'Weil der Waldboden Regenwasser filtert und sauber hält',
        'Weil es im Wald am meisten regnet',
        'Weil Bäume kein Wasser brauchen',
      ],
      explanation:
        'Über 40 Prozent der Fläche der Wasserschutzgebiete liegen im Wald. Ohne Wald müsste Trinkwasser aufwendiger und teurer gereinigt werden.',
    },
    {
      id: 'm04',
      points: 4,
      topic: 'society',
      question: 'Wie viele Menschen in Deutschland gehen mindestens einmal im Jahr in den Wald?',
      answers: ['Mehr als drei Viertel', 'Etwa ein Viertel', 'Etwa jeder Zehnte'],
      explanation:
        'In einer bundesweiten Befragung gaben gut drei Viertel an, mindestens einmal im Jahr im Wald zu sein. Er ist damit einer der wichtigsten Erholungsorte.',
    },
    {
      id: 'm05',
      points: 3,
      topic: 'environment',
      question: 'Seit 2018 sind in Deutschland große Waldflächen abgestorben. Was waren die Hauptursachen?',
      answers: ['Dürre und Borkenkäfer', 'Vulkanasche und Erdbeben', 'Zu viele Wanderer'],
      explanation:
        'Stürme, trockene Sommer und Borkenkäfer zerstörten bis 2021 rund 500.000 Hektar – fast 5 Prozent des Waldes. Das zeigt im Kleinen, was Waldverlust bedeutet.',
    },
    {
      id: 'm06',
      points: 4,
      topic: 'economy',
      question: 'Wofür ist Holz in Deutschland der wichtigste erneuerbare Energieträger?',
      answers: ['Für Wärme', 'Für Strom', 'Für Kraftstoff'],
      explanation:
        'Knapp zwei Drittel der erneuerbaren Wärme stammen aus Holz. Ohne Wald müsste diese Wärme anders erzeugt werden.',
    },
    {
      id: 'm07',
      points: 3,
      topic: 'society',
      question: 'Was schützt in den Alpen viele Dörfer und Straßen vor Lawinen und Steinschlag?',
      answers: ['Der Schutzwald', 'Der Nebel im Tal', 'Die Almwiesen'],
      explanation:
        'In den bayerischen Alpen sind rund 60 Prozent des Bergwaldes Schutzwald. Ohne ihn wären viele Täler kaum bewohnbar.',
    },
    {
      id: 'm08',
      points: 4,
      topic: 'environment',
      question: 'Wie viele Bäume stehen ungefähr in Deutschlands Wäldern?',
      answers: ['Rund 90 Milliarden', 'Rund 90 Millionen', 'Rund 900.000'],
      explanation: 'Das sind mehr als 1.000 Bäume pro Einwohner.',
    },
    {
      id: 'm09',
      points: 3,
      topic: 'economy',
      question: 'Was würde mit dem Holzpreis passieren, wenn Deutschland alles Holz importieren müsste?',
      answers: ['Er würde steigen', 'Er würde sinken', 'Er bliebe gleich'],
      explanation:
        'Lange Transportwege kosten Geld, und Deutschland wäre von anderen Ländern abhängig. Möbel, Papier und Bauen würden teurer.',
    },
    {
      id: 'm10',
      points: 3,
      topic: 'society',
      question: 'Was bedeutet „Waldbaden“?',
      answers: [
        'Bewusst Zeit im Wald verbringen, um sich zu erholen',
        'In einem Waldsee schwimmen',
        'Junge Bäume gießen',
      ],
      explanation:
        'Studien zeigen: Ein Aufenthalt im Wald senkt Stress. Auch in Deutschland ist Waldbaden beliebt. Ohne Wald würde dieser Erholungsort fehlen.',
    },
    {
      id: 'm11',
      points: 4,
      topic: 'environment',
      question: 'Der Wald ist ein Kohlenstoffspeicher. Was heißt das?',
      answers: [
        'Bäume nehmen CO₂ auf und lagern den Kohlenstoff in Holz und Boden ein',
        'Unter jedem Wald liegt Steinkohle',
        'Bäume stoßen mehr CO₂ aus als Autos',
      ],
      explanation:
        'Im deutschen Wald sind rund 2,2 Milliarden Tonnen Kohlenstoff gespeichert. Ohne Wald würde viel davon als CO₂ in die Luft gelangen.',
    },
    {
      id: 'm12',
      points: 3,
      topic: 'economy',
      question: 'Welche Industrie bräuchte ohne Wald dringend einen neuen Rohstoff?',
      answers: ['Die Papier- und Möbelindustrie', 'Die Fischerei', 'Die Hersteller von Computerchips'],
      explanation:
        'Papier, Karton und Möbel werden aus Holz gemacht. Ohne Wald müssten die Fabriken ihren Rohstoff teuer einkaufen oder schließen.',
    },
    {
      id: 'm13',
      points: 3,
      topic: 'society',
      question: 'Was passiert in Städten, wenn die Wälder in der Umgebung fehlen?',
      answers: [
        'Im Sommer wird es heißer und die Luft schlechter',
        'Im Sommer wird es kühler',
        'Es ändert sich nichts',
      ],
      explanation:
        'Wälder kühlen die Umgebung und liefern frische Luft. Fehlen sie, leiden vor allem ältere und kranke Menschen unter der Hitze.',
    },
    {
      id: 'm14',
      points: 4,
      topic: 'environment',
      question: 'Wie alt ist der deutsche Wald im Durchschnitt?',
      answers: ['Rund 80 Jahre', 'Rund 8 Jahre', 'Rund 800 Jahre'],
      explanation:
        'Laut Bundeswaldinventur sind es 82 Jahre. Ein verlorener Wald lässt sich also nicht schnell ersetzen – das dauert Generationen.',
    },
    {
      id: 'm15',
      points: 4,
      topic: 'economy',
      question: 'Warum ist Bauen mit Holz gut fürs Klima?',
      answers: [
        'Holz speichert Kohlenstoff und ersetzt Beton und Stahl',
        'Holzhäuser brauchen keine Heizung',
        'Holz kann nicht brennen',
      ],
      explanation:
        'Im Holz bleibt der Kohlenstoff über Jahrzehnte gebunden. Die Herstellung von Zement und Stahl verursacht dagegen viel CO₂.',
    },
    {
      id: 'm16',
      points: 3,
      topic: 'society',
      question: 'Was ist ein Waldkindergarten?',
      answers: [
        'Ein Kindergarten, in dem die Kinder fast den ganzen Tag draußen im Wald sind',
        'Ein Kindergarten aus Holz',
        'Eine Baumschule für junge Bäume',
      ],
      explanation:
        'In Deutschland gibt es weit über tausend Wald- und Naturkindergärten. Ohne Wald gäbe es diese Art zu lernen nicht.',
    },
    {
      id: 'm17',
      points: 3,
      topic: 'environment',
      question: 'Was passiert mit Specht, Wildkatze und Hirschkäfer, wenn der Wald verschwindet?',
      answers: [
        'Sie verlieren ihren Lebensraum und sterben bei uns aus',
        'Sie ziehen in die Städte und leben dort weiter',
        'Für sie ändert sich nichts',
      ],
      explanation:
        'Diese Arten sind auf alte Bäume und Totholz angewiesen. Ohne Wald ginge ein großer Teil der Artenvielfalt verloren.',
    },
    {
      id: 'm18',
      points: 4,
      topic: 'environment',
      question: 'Welche Bundesländer haben den größten Waldanteil?',
      answers: [
        'Rheinland-Pfalz und Hessen',
        'Schleswig-Holstein und Niedersachsen',
        'Sachsen-Anhalt und Mecklenburg-Vorpommern',
      ],
      explanation:
        'In Rheinland-Pfalz und Hessen sind jeweils rund 42 Prozent der Fläche bewaldet. In Schleswig-Holstein sind es nur etwa 11 Prozent.',
    },
    {
      id: 'm19',
      points: 3,
      topic: 'society',
      question: 'Das Bundeswaldgesetz nennt drei Aufgaben des Waldes: Nutzen, Schützen und …?',
      answers: ['Erholung', 'Verkehr', 'Verteidigung'],
      explanation:
        'Der Wald liefert Holz (Nutzfunktion), schützt Klima, Wasser und Boden (Schutzfunktion) und dient den Menschen zur Erholung (Erholungsfunktion).',
    },
    {
      id: 'm20',
      points: 4,
      topic: 'economy',
      question: 'Was passiert mit Äckern, wenn Wälder als Windschutz fehlen?',
      answers: [
        'Der Wind trägt fruchtbaren Boden ab, und die Felder trocknen schneller aus',
        'Die Ernte wird größer',
        'Die Felder brauchen keinen Dünger mehr',
      ],
      explanation:
        'Wälder bremsen den Wind und halten Feuchtigkeit in der Landschaft. Ohne sie hätte auch die Landwirtschaft schlechtere Ernten.',
    },

    // Schwer: 5 oder 6 Punkte
    {
      id: 'h01',
      points: 6,
      topic: 'economy',
      question: 'Wie viel Umsatz macht die Forst- und Holzwirtschaft in Deutschland pro Jahr ungefähr?',
      answers: [
        'Rund 180 Milliarden Euro',
        'Rund 18 Milliarden Euro',
        'Rund 1,8 Milliarden Euro',
        'Rund 180 Millionen Euro',
      ],
      explanation:
        'Das Thünen-Institut nennt für 2020 rund 181 Milliarden Euro. Dieser Umsatz hängt am Rohstoff Holz.',
    },
    {
      id: 'h02',
      points: 6,
      topic: 'environment',
      question: 'Welche Baumart hat die Fichte als häufigste Baumart in Deutschland abgelöst?',
      answers: ['Die Kiefer', 'Die Buche', 'Die Eiche', 'Die Douglasie'],
      explanation:
        'Laut Bundeswaldinventur 2022 wächst die Kiefer auf 2,4 Millionen Hektar, die Fichte nur noch auf 2,3 Millionen. Dürre und Borkenkäfer haben vor allem Fichten getroffen.',
    },
    {
      id: 'h03',
      points: 5,
      topic: 'economy',
      question: 'Wer prägte 1713 den Gedanken der Nachhaltigkeit, weil das Holz knapp wurde?',
      answers: [
        'Hans Carl von Carlowitz',
        'Alexander von Humboldt',
        'Johann Wolfgang von Goethe',
        'Otto von Bismarck',
      ],
      explanation:
        'Der sächsische Oberberghauptmann forderte, nur so viel Holz zu schlagen, wie nachwächst. Der Bergbau drohte damals am Holzmangel zu scheitern.',
    },
    {
      id: 'h04',
      points: 6,
      topic: 'environment',
      question: 'Wie viel Kohlenstoff ist im deutschen Wald gespeichert – in Bäumen, Totholz und Boden?',
      answers: [
        'Rund 2,2 Milliarden Tonnen',
        'Rund 22 Millionen Tonnen',
        'Rund 220.000 Tonnen',
        'Rund 220 Milliarden Tonnen',
      ],
      explanation:
        'Das meldet das Thünen-Institut zur Bundeswaldinventur 2022. Der Wald ist damit einer der größten Kohlenstoffspeicher des Landes.',
    },
    {
      id: 'h05',
      points: 6,
      topic: 'environment',
      question: 'Was stellte die Bundeswaldinventur 2022 zum Klimaschutz fest?',
      answers: [
        'Der Wald gibt seit 2017 mehr Kohlenstoff ab, als er aufnimmt',
        'Der Wald nimmt doppelt so viel CO₂ auf wie 2012',
        'Die Waldfläche hat sich halbiert',
        'Der Wald speichert keinen Kohlenstoff',
      ],
      explanation:
        'Durch Dürre und Käferschäden verlor der lebende Baumbestand seit 2017 rund 42 Millionen Tonnen Kohlenstoff. Schon ein geschwächter Wald fehlt also beim Klimaschutz.',
    },
    {
      id: 'h06',
      points: 6,
      topic: 'economy',
      question: 'Wie viel Holz wird in Deutschland pro Jahr ungefähr geerntet?',
      answers: [
        'Rund 60 Millionen Kubikmeter',
        'Rund 600.000 Kubikmeter',
        'Rund 6 Millionen Kubikmeter',
        'Rund 6 Milliarden Kubikmeter',
      ],
      explanation:
        '2024 waren es laut Statistischem Bundesamt 61,2 Millionen Kubikmeter. Diese Menge müsste ohne Wald importiert oder ersetzt werden.',
    },
    {
      id: 'h07',
      points: 5,
      topic: 'society',
      question: 'In welchem Gesetz steht, dass jeder den Wald zur Erholung betreten darf?',
      answers: ['Im Bundeswaldgesetz', 'Im Grundgesetz', 'In der Straßenverkehrsordnung', 'Im Jugendschutzgesetz'],
      explanation:
        'Paragraf 14 des Bundeswaldgesetzes erlaubt das Betreten des Waldes zur Erholung – auf eigene Gefahr.',
    },
    {
      id: 'h08',
      points: 5,
      topic: 'environment',
      question: 'Wie viel Wasser kann unter einem Quadratmeter Waldboden gespeichert sein?',
      answers: ['Bis zu 200 Liter', 'Bis zu 2 Liter', 'Bis zu 20 Liter', 'Bis zu 2.000 Liter'],
      explanation:
        'Diese Zahl nennt die Schutzgemeinschaft Deutscher Wald. Der Waldboden ist damit ein natürlicher Hochwasserschutz und Trinkwasserspeicher.',
    },
    {
      id: 'h09',
      points: 5,
      topic: 'economy',
      question: 'Wie viele Menschen besitzen in Deutschland Wald?',
      answers: ['Rund 2 Millionen', 'Rund 2.000', 'Rund 20.000', 'Rund 200.000'],
      explanation:
        'Die meisten besitzen nur kleine Flächen. Ohne Wald verlören sie Eigentum und Einnahmen.',
    },
    {
      id: 'h10',
      points: 5,
      topic: 'society',
      question: 'Welcher Wald wurde 1970 Deutschlands erster Nationalpark?',
      answers: ['Der Bayerische Wald', 'Der Schwarzwald', 'Der Harz', 'Der Teutoburger Wald'],
      explanation:
        'Nationalparks ziehen jedes Jahr viele Besucher an. Davon leben Gasthöfe, Hotels und Geschäfte in der Region.',
    },
    {
      id: 'h11',
      points: 6,
      topic: 'economy',
      question: 'Wie viele Unternehmen gehören in Deutschland zur Forst- und Holzwirtschaft?',
      answers: ['Über 110.000', 'Etwa 1.100', 'Etwa 11.000', 'Über 1,1 Millionen'],
      explanation:
        'Das Thünen-Institut zählt für 2020 rund 111.500 Unternehmen – vom kleinen Forstbetrieb bis zur Papierfabrik. Viele davon liegen auf dem Land.',
    },
    {
      id: 'h12',
      points: 5,
      topic: 'environment',
      question: 'Wie sähe Deutschland ohne den Einfluss des Menschen von Natur aus?',
      answers: [
        'Fast ganz mit Laubwald bedeckt, vor allem mit Buchen',
        'Größtenteils Grasland',
        'Größtenteils Moor und Heide',
        'Fast ganz mit Fichtenwald bedeckt',
      ],
      explanation:
        'Deutschland ist von Natur aus ein Waldland. Heute ist nur noch ein Drittel bewaldet – der Rest wurde über Jahrhunderte gerodet.',
    },
    {
      id: 'h13',
      points: 6,
      topic: 'economy',
      question: 'Wie viel teurer sind Lawinenverbauungen und Steinschlagnetze als ein gesunder Schutzwald?',
      answers: ['Etwa 10- bis 30-mal so teuer', 'Etwa doppelt so teuer', 'Etwa gleich teuer', 'Sie sind billiger'],
      explanation:
        'Das rechnet der Deutsche Alpenverein vor. Ohne Schutzwald müssten Staat und Gemeinden sehr viel Geld für Bauwerke ausgeben.',
    },
    {
      id: 'h14',
      points: 5,
      topic: 'environment',
      question: 'Wie viel CO₂ ist in einem Kubikmeter Holz ungefähr gebunden?',
      answers: ['Rund 1 Tonne', 'Rund 1 Kilogramm', 'Rund 10 Kilogramm', 'Rund 100 Tonnen'],
      explanation:
        'Als Faustregel gilt: ein Kubikmeter Holz, eine Tonne CO₂. Verbautes Holz hält diesen Kohlenstoff über Jahrzehnte fest.',
    },
    {
      id: 'h15',
      points: 6,
      topic: 'environment',
      question: 'Wie viel Wald ging in Deutschland von 2018 bis 2021 durch Stürme, Dürre und Borkenkäfer verloren?',
      answers: ['Rund 500.000 Hektar', 'Rund 5.000 Hektar', 'Rund 50.000 Hektar', 'Rund 5 Millionen Hektar'],
      explanation:
        'Das Deutsche Zentrum für Luft- und Raumfahrt hat aus Satellitenbildern rund 501.000 Hektar ermittelt – fast doppelt so groß wie das Saarland.',
    },
    {
      id: 'h16',
      points: 5,
      topic: 'economy',
      question: 'Deutschland ist in Europa der größte Hersteller von …?',
      answers: ['Papier', 'Kork', 'Bambus', 'Kautschuk'],
      explanation:
        'Papier und Karton werden aus Holzfasern und Altpapier hergestellt. Ohne Wald fehlt der Papierindustrie ihr wichtigster frischer Rohstoff.',
    },
    {
      id: 'h17',
      points: 5,
      topic: 'society',
      question: 'Was war die „Holznot“ um das Jahr 1700?',
      answers: [
        'Holz wurde knapp, weil Bergbau, Hütten und Städte riesige Mengen verbrauchten',
        'Ein Pilz zerstörte fast alle Holzhäuser',
        'Holz durfte nur noch der Adel besitzen',
        'Es gab zu viel Holz, und die Preise stürzten ab',
      ],
      explanation:
        'Deutschland hat schon einmal erlebt, was zu wenig Wald bedeutet: Brennholz und Bauholz wurden knapp und teuer. Daraus entstand die geregelte Forstwirtschaft.',
    },
    {
      id: 'h18',
      points: 6,
      topic: 'society',
      question: 'Wie viel Staub und Ruß kann ein Hektar Wald pro Jahr aus der Luft filtern?',
      answers: ['Bis zu 50 Tonnen', 'Bis zu 50 Kilogramm', 'Bis zu 500 Kilogramm', 'Bis zu 5.000 Tonnen'],
      explanation:
        'Diese Zahl nennt die Schutzgemeinschaft Deutscher Wald. Ein Hektar ist etwa so groß wie anderthalb Fußballfelder.',
    },
    {
      id: 'h19',
      points: 6,
      topic: 'society',
      question: 'Wie viel der Fläche aller deutschen Wasserschutzgebiete liegt im Wald?',
      answers: ['Über 40 Prozent', 'Etwa 4 Prozent', 'Etwa 15 Prozent', 'Über 90 Prozent'],
      explanation:
        'Wald bedeckt 32 Prozent des Landes, aber über 40 Prozent der Wasserschutzgebiete. Für sauberes Trinkwasser ist er also besonders wichtig.',
    },
    {
      id: 'h20',
      points: 5,
      topic: 'society',
      question: 'Wie viel kühler als in der Stadt ist es an heißen Sommertagen im Wald?',
      answers: ['Etwa 3 bis 6 Grad', 'Etwa 0,1 Grad', 'Etwa 15 bis 20 Grad', 'Gar nicht – es ist gleich warm'],
      explanation:
        'Schatten und verdunstendes Wasser kühlen die Luft. In Hitzesommern ist das für die Gesundheit vieler Menschen wichtig.',
    },
  ];

  /*
   * Die Leitern auf dem Brett. Der Schlüssel ist das Feld am unteren Ende der
   * Leiter (siehe game.js). Jede Leiter hat zwei Texte:
   *   up   – wer unten landet, steigt hinauf: Das gibt uns der Wald.
   *   down – wer oben landet, muss hinunter: Das passiert ohne Wald.
   */
  const LADDER_EVENTS = {
    3: {
      up: {
        title: 'Aufforstung',
        text: 'Eure Klasse pflanzt junge Bäume auf einer kahlen Fläche. Neuer Wald wächst heran.',
      },
      down: {
        title: 'Kahlschlag',
        text: 'Am Hang wurden alle Bäume gefällt. Ohne Wurzeln spült der nächste Starkregen den Boden weg.',
      },
    },
    7: {
      up: {
        title: 'Holzbau',
        text: 'Im Ort entsteht eine Schule aus Holz aus dem eigenen Wald. Das schafft Arbeit in der Region und hält Kohlenstoff über Jahrzehnte fest.',
      },
      down: {
        title: 'Sägewerk schließt',
        text: 'Kein Wald, kein Holz: Das Sägewerk macht dicht, und im Ort gehen Arbeitsplätze verloren.',
      },
    },
    9: {
      up: {
        title: 'Wasserspeicher',
        text: 'Der Waldboden saugt den Regen auf wie ein Schwamm und filtert ihn. Daraus wird sauberes Trinkwasser.',
      },
      down: {
        title: 'Hochwasser',
        text: 'Ohne Waldboden fließt der Regen sofort ab. Der Bach tritt über die Ufer und überschwemmt das Dorf.',
      },
    },
    14: {
      up: {
        title: 'Wanderurlaub',
        text: 'Gäste kommen zum Wandern in den Schwarzwald. Hotels, Gasthöfe und Läden verdienen daran.',
      },
      down: {
        title: 'Keine Gäste mehr',
        text: 'Ohne Wald bleiben die Wanderer weg. Im Harz müssen Hotels und Gasthöfe schließen.',
      },
    },
    20: {
      up: {
        title: 'Frische Luft',
        text: 'Der Stadtwald kühlt an heißen Tagen und filtert Staub aus der Luft. Viele Menschen erholen sich dort.',
      },
      down: {
        title: 'Hitzesommer',
        text: 'Ohne kühlenden Wald heizt sich die Stadt auf, und die Luft wird staubig. Vor allem ältere Menschen leiden darunter.',
      },
    },
    27: {
      up: {
        title: 'Schutzwald',
        text: 'In den bayerischen Alpen hält der Bergwald Lawinen und Steinschlag auf. Dorf und Straße bleiben sicher.',
      },
      down: {
        title: 'Lawine',
        text: 'Ohne Schutzwald donnert eine Lawine ins Tal. Die Straße ist gesperrt, das Dorf ist abgeschnitten.',
      },
    },
  };

  /* Die Antwort auf die Forschungsfrage – erscheint am Spielende und unter „Fazit“. */
  const CONCLUSION = {
    groups: [
      {
        topic: 'economy',
        points: [
          'Gut eine Million Arbeitsplätze und rund 180 Milliarden Euro Umsatz in Forst und Holz wären in Gefahr.',
          'Holz für Häuser, Möbel, Papier und Wärme müsste importiert werden. Das wäre teurer und würde Deutschland abhängig machen.',
          'Urlaubsregionen wie Schwarzwald, Harz und Bayerischer Wald würden Gäste verlieren.',
          'Schutz vor Hochwasser und Lawinen und sauberes Trinkwasser müssten mit teurer Technik ersetzt werden.',
        ],
      },
      {
        topic: 'society',
        points: [
          'Einer der wichtigsten Erholungsorte würde fehlen: Mehr als drei Viertel der Menschen gehen in den Wald.',
          'Städte würden im Sommer heißer und die Luft staubiger. Das schadet der Gesundheit.',
          'Hochwasser, Erdrutsche und Lawinen würden mehr Dörfer bedrohen.',
          'Ein Stück Kultur ginge verloren: Märchen, Redewendungen, Waldkindergärten.',
        ],
      },
      {
        topic: 'environment',
        points: [
          'Rund 2,2 Milliarden Tonnen gespeicherter Kohlenstoff würden zum großen Teil als CO₂ in die Luft gelangen.',
          'Tausende Arten von Tieren, Pflanzen und Pilzen würden ihren Lebensraum verlieren.',
          'Neuer Wald braucht Generationen: Der deutsche Wald ist im Durchschnitt 82 Jahre alt.',
        ],
      },
    ],
    summary:
      'Ohne Wald wäre Deutschland ärmer, heißer und unsicherer. Der Wald ist Arbeitsplatz, Schutzschild und Erholungsort zugleich.',
  };

  /* Woher die Zahlen stammen. */
  const SOURCES = [
    {
      label: 'Thünen-Institut: Bundeswaldinventur 2022',
      detail: 'Waldfläche, Baumarten, Alter, Kohlenstoff',
      url: 'https://www.bundeswaldinventur.de',
    },
    {
      label: 'Thünen-Institut: Pressemitteilung zur Bundeswaldinventur, 8.10.2024',
      detail: 'Kohlenstoffspeicher, Wald als Kohlenstoffquelle seit 2017',
      url: 'https://thuenen.de/media/ti/Newsroom/Presse/Pressemitteilungen/2024/2024-10-08_Bundeswaldinventur_2022/2024-10-08_PM_BWI.pdf',
    },
    {
      label: 'Thünen-Institut: Clusterstatistik Forst und Holz 2020',
      detail: 'Beschäftigte, Umsatz, Unternehmen',
      url: 'https://www.thuenen.de/media/institute/wf/HM_div._Statistik_Dateien/Dateien_-_Bilanzen_-_Tabellen/Produktion_Verwendung/Clusterstatistik/de_Clusterstatistik_Deutschland.pdf',
    },
    {
      label: 'Statistisches Bundesamt: Holzeinschlag 2024',
      detail: 'Geerntete Holzmenge',
      url: 'https://www.waldwissen.net/de/waldwirtschaft/holz-und-markt/holzmarkt/holzeinschlag-2024',
    },
    {
      label: 'Umweltbundesamt: Erneuerbare Energien in Zahlen',
      detail: 'Holz als Wärmequelle',
      url: 'https://www.umweltbundesamt.de/themen/klima-energie/erneuerbare-energien/erneuerbare-energien-in-zahlen',
    },
    {
      label: 'Schutzgemeinschaft Deutscher Wald: Wald und Wasser',
      detail: 'Wasserspeicher Waldboden, Wasserschutzgebiete, Luftfilter',
      url: 'https://sdw.de/fileadmin/Bundesverband/07_Presse/Presseinformationen/240318_Tag_des_Wassers_Wald_und_Wasser.pdf',
    },
    {
      label: 'Deutscher Alpenverein: 40 Jahre Aktion Schutzwald',
      detail: 'Schutzwald in den Alpen, Kosten technischer Verbauung',
      url: 'https://www.alpenverein.de/40-jahre-schutzwald',
    },
    {
      label: 'Bundeswaldgesetz, §§ 1 und 14',
      detail: 'Aufgaben des Waldes, Betretungsrecht',
      url: 'https://www.gesetze-im-internet.de/bwaldg/',
    },
    {
      label: 'Deutsches Zentrum für Luft- und Raumfahrt (2022)',
      detail: 'Baumverluste 2018 bis 2021 aus Satellitendaten',
    },
    {
      label: 'Elsasser und Weller (Thünen-Institut, 2013)',
      detail: 'Befragung zu Waldbesuchen',
    },
  ];

  const namespace = (global.WaldLeiternspiel = global.WaldLeiternspiel || {});
  namespace.content = {
    RESEARCH_QUESTION,
    TOPIC_LABELS,
    QUESTIONS,
    LADDER_EVENTS,
    CONCLUSION,
    SOURCES,
  };
})(globalThis);

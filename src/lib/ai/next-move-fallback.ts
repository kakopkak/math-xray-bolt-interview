export type NextMoveSeverity = "none" | "minor" | "major" | "fundamental";

export type NextMoveClusterDistributionEntry = {
  misconceptionCode: string;
  label: string;
  labelEt: string;
  count: number;
  severity: NextMoveSeverity;
};

export type NextMoveFallbackInput = {
  gradeLevel: number;
  topic: string;
  totalStudents: number;
  clusters: NextMoveClusterDistributionEntry[];
};

function isNoErrorCode(code: string): boolean {
  return code.endsWith('_NO_ERROR');
}

export type NextMoveFallbackPayload = {
  nextProblem: {
    prompt: string;
    promptEt: string;
    answer: string;
  };
  rationaleEt: string;
  expectedErrorsByCluster: Array<{
    misconceptionCode: string;
    expectedAnswer: string;
    whyTheyWillMissItEt: string;
  }>;
  teacherMoveEt: string;
};

type NextMoveBlueprint = Pick<
  NextMoveFallbackPayload,
  "nextProblem" | "rationaleEt" | "teacherMoveEt"
>;

function severityWeight(severity: NextMoveSeverity): number {
  if (severity === "fundamental") return 4;
  if (severity === "major") return 3;
  if (severity === "minor") return 2;
  return 1;
}

function getExpectedErrorForCluster(code: string): {
  expectedAnswer: string;
  whyTheyWillMissItEt: string;
} {
  switch (code) {
    case "QE_SIGN_ERROR":
      return {
        expectedAnswer: "x = -2 või x = -3",
        whyTheyWillMissItEt: "Märgid lähevad teguritest juurteni ülekandmisel valeks.",
      };
    case "QE_INCOMPLETE_FACTOR":
      return {
        expectedAnswer: "x = -2 või x = -6",
        whyTheyWillMissItEt: "Tegurid valitakse nii, et summa ja korrutis ei sobi korraga.",
      };
    case "QE_FORMULA_MISREMEMBER":
      return {
        expectedAnswer: "x = (-b ± √(b² + 4ac)) / 2a",
        whyTheyWillMissItEt: "Ruutvalemi diskriminandi märk meenub valesti.",
      };
    case "QE_SQRT_BOTH_SIDES":
      return {
        expectedAnswer: "x = 7",
        whyTheyWillMissItEt: "Ruutjuure võtmisel jäetakse ±-haru välja.",
      };
    case "QE_DIVISION_BY_X":
      return {
        expectedAnswer: "x = 3",
        whyTheyWillMissItEt: "Muutujaga jagamisel kaob lahend x = 0.",
      };
    case "QE_ARITHMETIC":
      return {
        expectedAnswer: "x = -9 või x = 9",
        whyTheyWillMissItEt: "Arvutusetapis tehakse lihtne tehte- või märgiviga.",
      };
    case "QE_WRONG_METHOD":
      return {
        expectedAnswer: "x = 3",
        whyTheyWillMissItEt: "Ruutvõrrandit käsitletakse lineaarvõrrandina ja kaotatakse üks juur.",
      };
    default:
      return {
        expectedAnswer: "Vastus jääb osaliselt õigeks või puudub üks lahend.",
        whyTheyWillMissItEt: "Lahenduskäik katkeb vales meetodis või kontrollita tehte etapis.",
      };
  }
}

function buildExpectedErrorsByCluster(
  clusters: NextMoveClusterDistributionEntry[]
): NextMoveFallbackPayload["expectedErrorsByCluster"] {
  return clusters
    .filter((cluster) => cluster.count > 0 && !isNoErrorCode(cluster.misconceptionCode))
    .map((cluster) => ({
      misconceptionCode: cluster.misconceptionCode,
      ...getExpectedErrorForCluster(cluster.misconceptionCode),
    }));
}

function buildConsolidationBlueprint(): NextMoveBlueprint {
  return {
    nextProblem: {
      prompt: "Solve: 2x^2 - 7x + 3 = 0 and justify the method you choose.",
      promptEt: "Lahenda: 2x² - 7x + 3 = 0 ja põhjenda, miks valid just selle meetodi.",
      answer: "x = 1/2 või x = 3",
    },
    rationaleEt:
      "Klassi põhivead on juba kontrolli all, seega järgmine samm peaks kinnistama meetodi valikut ja kontrollharjumust. See ülesanne nõuab nii korrektset tehnikat kui ka lõppvastuse kontrolli.",
    teacherMoveEt:
      "Lase õpilastel enne arvutamist kirja panna, millise meetodi nad valivad ja kuidas nad lõpus vastust kontrollivad.",
  };
}

function buildBlueprintForCode(code: string): NextMoveBlueprint {
  switch (code) {
    case "QE_SIGN_ERROR":
      return {
        nextProblem: {
          prompt: "Solve: x^2 - 5x + 6 = 0.",
          promptEt: "Lahenda: x² - 5x + 6 = 0.",
          answer: "x = 2 või x = 3",
        },
        rationaleEt:
          "See ülesanne toob märgiloogika kohe esile, sest lahendid on positiivsed, kuid vale märgitõlgendus annab negatiivsed juured. Õpetaja näeb kiiresti, kes ajab segamini teguri märgi ja juure märgi.",
        teacherMoveEt:
          "Joonista koos klassiga enne lahendamist märgitabel, mis seob iga teguri nullkoha vastava juure märgiga.",
      };
    case "QE_INCOMPLETE_FACTOR":
      return {
        nextProblem: {
          prompt: "Factor and solve: x^2 + 7x + 12 = 0.",
          promptEt: "Tegurda ja lahenda: x² + 7x + 12 = 0.",
          answer: "x = -3 või x = -4",
        },
        rationaleEt:
          "Ülesanne eristab, kas õpilane kontrollib korraga nii tegurite summat kui ka korrutist. Vale tegurdamine on siin lihtne märgata ning parandatav ühe konkreetse kontrollreegliga.",
        teacherMoveEt:
          "Nõua, et iga paarilise tegurdamise juures kirjutatakse eraldi kontroll: summa = 7 ja korrutis = 12.",
      };
    case "QE_FORMULA_MISREMEMBER":
      return {
        nextProblem: {
          prompt: "Solve with the quadratic formula: 2x^2 + 3x - 2 = 0.",
          promptEt: "Lahenda ruutvalemiga: 2x² + 3x - 2 = 0.",
          answer: "x = 1/2 või x = -2",
        },
        rationaleEt:
          "Selles näites annab diskriminandi vale märk kohe teistsuguse tulemuse, seega valemi meenutamise viga tuleb kiiresti nähtavale. Ülesanne sobib hästi ruutvalemi struktuuri kinnistamiseks.",
        teacherMoveEt:
          "Palun õpilastel kirjutada valem enne asendamist täpselt lahti ja tõmmata diskriminandi märgile värviline rõhutus.",
      };
    case "QE_SQRT_BOTH_SIDES":
      return {
        nextProblem: {
          prompt: "Solve: (x - 4)^2 = 9.",
          promptEt: "Lahenda: (x - 4)² = 9.",
          answer: "x = 1 või x = 7",
        },
        rationaleEt:
          "Ülesanne testib otse, kas ruutjuure võtmisel arvestatakse mõlemat haru. Kui õpilane annab ainult ühe lahendi, on ±-loogika vajakajäämine koheselt tuvastatav.",
        teacherMoveEt:
          "Kirjutage klassiga iga ruutjuure samm kahes reas: x - 4 = 3 ja x - 4 = -3.",
      };
    case "QE_DIVISION_BY_X":
      return {
        nextProblem: {
          prompt: "Solve without dividing by x: x^2 - 3x = 0.",
          promptEt: "Lahenda x-iga jagamata: x² - 3x = 0.",
          answer: "x = 0 või x = 3",
        },
        rationaleEt:
          "See ülesanne paljastab kohe, kas õpilane kaotab lahendi x = 0 jagamise tõttu. Null-lahendi säilitamine on siin võtmeoskus ja seda saab üheskoos kiiresti kinnistada.",
        teacherMoveEt:
          "Rõhuta, et enne jagamist tuleb kontrollida, kas jagaja võib olla null, ning eelistada tegurdamist nulltoote reegliga.",
      };
    case "QE_ARITHMETIC":
      return {
        nextProblem: {
          prompt: "Solve and check each arithmetic step: x^2 - 9 = 0.",
          promptEt: "Lahenda ja kontrolli iga arvutusetappi: x² - 9 = 0.",
          answer: "x = -3 või x = 3",
        },
        rationaleEt:
          "Raskus ei ole meetodis, vaid täpses arvutuses ja kontrollis. Lihtsa struktuuriga võrrand võimaldab keskenduda puhtalt arvutusvigade ennetamisele.",
        teacherMoveEt:
          "Lase õpilastel pärast iga tehet teha kiire vastupidine kontroll, enne kui nad liiguvad järgmisele reale.",
      };
    case "QE_WRONG_METHOD":
      return {
        nextProblem: {
          prompt: "Choose a method and solve: x^2 + 4x + 3 = 0.",
          promptEt: "Vali sobiv meetod ja lahenda: x² + 4x + 3 = 0.",
          answer: "x = -1 või x = -3",
        },
        rationaleEt:
          "Ülesanne sunnib esmalt ära tundma, et tegu on ruutvõrrandiga, mitte lineaarsega. Nii eristub kiiresti, kes eksib meetodi valikus enne arvutamist.",
        teacherMoveEt:
          "Alustage lahendust alati lühikese küsimusega „Mis tüüpi võrrand see on?” ja alles siis valige meetod.",
      };
    case "QE_NO_ERROR":
    case "LE_NO_ERROR":
    case "FR_NO_ERROR":
      return buildConsolidationBlueprint();
    default:
      return {
        nextProblem: {
          prompt: "Solve and justify: x^2 - x - 6 = 0.",
          promptEt: "Lahenda ja põhjenda: x² - x - 6 = 0.",
          answer: "x = -2 või x = 3",
        },
        rationaleEt:
          "Valitud ülesanne nõuab selget meetodit ja sammude kontrolli, mistõttu sobib eri tüüpi väärarusaamade eristamiseks. Õpetaja saab ühe ülesandega näha nii strateegia kui ka arvutuse kvaliteeti.",
        teacherMoveEt:
          "Palu igal õpilasel kirjutada ühe lausega, miks just see meetod valiti, enne kui vastus esitatakse.",
      };
  }
}

export function buildFallbackNextMove(input: NextMoveFallbackInput): NextMoveFallbackPayload {
  const target = [...input.clusters]
    .filter((cluster) => cluster.count > 0 && !isNoErrorCode(cluster.misconceptionCode))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return severityWeight(b.severity) - severityWeight(a.severity);
    })[0];

  const blueprint = target
    ? buildBlueprintForCode(target.misconceptionCode)
    : buildConsolidationBlueprint();

  return {
    ...blueprint,
    expectedErrorsByCluster: buildExpectedErrorsByCluster(input.clusters),
  };
}

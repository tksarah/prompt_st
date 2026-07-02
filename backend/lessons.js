export const rubricItems = [
  {
    id: "goal",
    label: "目的",
    maxScore: 4,
    description: "AIに何を作ってほしいかが明確か"
  },
  {
    id: "context",
    label: "背景",
    maxScore: 4,
    description: "宿泊客、場面、前提情報が分かるか"
  },
  {
    id: "constraints",
    label: "制約",
    maxScore: 4,
    description: "個人情報、未確認情報、断定を避ける条件があるか"
  },
  {
    id: "output",
    label: "出力形式",
    maxScore: 4,
    description: "形式、長さ、トーン、必要項目が指定されているか"
  },
  {
    id: "hospitality",
    label: "接客品質",
    maxScore: 4,
    description: "ホテルらしい丁寧さ、安心感、確認姿勢があるか"
  },
  {
    id: "examples",
    label: "例の使い方",
    maxScore: 4,
    description: "Few-Shotの例をAIがまねる対象として示せているか"
  },
  {
    id: "consistency",
    label: "型の一貫性",
    maxScore: 4,
    description: "例と同じ構成、文体、粒度で出力させる指定があるか"
  }
];

export const zeroShotExercises = [
  {
    id: "zero-prearrival-reply",
    exerciseType: "zero-shot",
    displayLabel: "Zero-Shot 1",
    shortTitle: "宿泊前メール返信",
    title: "宿泊前の問い合わせに返信する",
    estimatedMinutes: 8,
    focus: "例を入れず、目的・背景・制約・出力形式を指定して返信文を作る",
    principles: ["目的", "背景", "制約", "出力形式", "接客品質"],
    evaluationRubricIds: ["goal", "context", "constraints", "output", "hospitality"],
    promptScenario:
      "宿泊予定のお客様から、チェックイン前の荷物預かりと朝食について問い合わせが届きました。AIにどのように依頼しますか？",
    sourceText:
      "お客様は明日15時にチェックイン予定。13時ごろホテルに到着し、荷物を預けたい。同行者にベジタリアンの方が1名いる。朝食会場にベジタリアン向けメニューがあるか知りたい。ホテルの料金、空室、特別対応の可否はAIに断定させない。返信文はお客様向けで、安心感のある丁寧な日本語にしたい。",
    referenceItems: [
      { label: "お客様", value: "明日15時チェックイン予定" },
      { label: "問い合わせ", value: "13時ごろの荷物預かり、朝食のベジタリアン対応" },
      { label: "注意", value: "料金、空室、特別対応の可否を断定しない" },
      { label: "出力", value: "お客様向けメール、220字以内、確認が必要な点を含める" }
    ],
    examples: [],
    checklist: [
      "何を作るかが書かれている",
      "お客様の状況が入っている",
      "断定してはいけない情報が指定されている",
      "文字数や文体が指定されている",
      "安心感のある接客トーンが指定されている"
    ],
    hint:
      "「お客様への返信文を作る」「未確認情報は確認が必要と書く」「丁寧で安心感のある文体」の3点を入れると整います。",
    badExample: "荷物預かりと朝食について返事を書いて。",
    starterPrompt:
      "目的: 宿泊予定のお客様への問い合わせ返信メールを作ってください。\n\n背景:\n- お客様は明日15時にチェックイン予定です。\n- 13時ごろホテルに到着し、荷物を預けたいと希望しています。\n- 同行者にベジタリアンの方が1名います。\n- 朝食会場にベジタリアン向けメニューがあるか知りたい状況です。\n\n制約:\n- 料金、空室、特別対応の可否は断定しないでください。\n- 分からない点は「確認いたします」と表現してください。\n- 個人情報は入れないでください。\n\n出力形式:\n- お客様向けメール本文\n- 220字以内\n- 丁寧で安心感のあるホテル接客のトーン\n- 最後に確認が必要な点を自然に含める"
  },
  {
    id: "zero-review-reply",
    exerciseType: "zero-shot",
    displayLabel: "Zero-Shot 2",
    shortTitle: "口コミ返信",
    title: "宿泊後の口コミに返信する",
    estimatedMinutes: 8,
    focus: "公開返信として、感謝・お詫び・改善姿勢を過不足なく入れる",
    principles: ["目的", "背景", "制約", "出力形式", "接客品質"],
    evaluationRubricIds: ["goal", "context", "constraints", "output", "hospitality"],
    promptScenario:
      "宿泊予約サイトに口コミが投稿されました。良い点と不満点の両方が含まれています。AIにどのように返信文作成を依頼しますか？",
    sourceText:
      "口コミ: フロントの方は親切でした。部屋も清潔で過ごしやすかったです。ただ、朝食会場が混雑していて席を探すのに時間がかかりました。次回はもう少し落ち着いて朝食を取りたいです。公開返信なので、個人を特定する情報は書かない。改善を断定しすぎず、受け止めと今後の参考にする姿勢を示したい。",
    referenceItems: [
      { label: "良い点", value: "フロント対応、客室清掃" },
      { label: "不満点", value: "朝食会場の混雑、席探しに時間がかかった" },
      { label: "注意", value: "個人情報を書かない、改善完了を断定しない" },
      { label: "出力", value: "公開口コミ返信、260字以内" }
    ],
    examples: [],
    checklist: [
      "感謝とお詫びの両方が入る指定がある",
      "口コミ内容の背景が入っている",
      "個人情報や過度な断定を避ける指定がある",
      "公開返信としての長さとトーンが指定されている",
      "ホテルらしい誠実さが指定されている"
    ],
    hint:
      "公開返信では、良い点への感謝、不満点へのお詫び、今後の参考にする姿勢を短く入れると安全です。",
    badExample: "この口コミに良い感じで返して。",
    starterPrompt:
      "目的: 宿泊予約サイトに掲載する口コミ返信文を作ってください。\n\n背景:\n- お客様はフロント対応と客室清掃を良い点として書いています。\n- 朝食会場が混雑し、席を探すのに時間がかかった点を不満として書いています。\n- 返信は公開されます。\n\n制約:\n- 個人を特定する情報は書かないでください。\n- 改善が完了したように断定しないでください。\n- 言い訳に聞こえる表現は避けてください。\n\n出力形式:\n- 260字以内の口コミ返信文\n- 感謝、お詫び、今後の参考にする姿勢を含める\n- 丁寧で誠実なホテル接客のトーン"
  },
  {
    id: "zero-complaint-first-response",
    exerciseType: "zero-shot",
    displayLabel: "Zero-Shot 3",
    shortTitle: "クレーム初期対応",
    title: "滞在中のクレームに初期対応する",
    estimatedMinutes: 8,
    focus: "事実確認が必要な場面で、謝意と確認姿勢を安全に表現する",
    principles: ["目的", "背景", "制約", "出力形式", "接客品質"],
    evaluationRubricIds: ["goal", "context", "constraints", "output", "hospitality"],
    promptScenario:
      "滞在中のお客様から、隣室の音が気になるという連絡が入りました。フロントが最初に返す文面をAIに作らせるには、どう依頼しますか？",
    sourceText:
      "お客様は22時ごろ、隣室の話し声が気になるとフロントにチャットで連絡した。部屋番号などの個人情報はAIに入れない。原因や補償、部屋移動の可否はまだ確認できていない。まず不快な思いへのお詫び、状況確認、スタッフが確認する旨を伝えたい。チャット返信なので短く、落ち着いた表現にしたい。",
    referenceItems: [
      { label: "場面", value: "滞在中、22時ごろ、客室内チャット" },
      { label: "困りごと", value: "隣室の話し声が気になる" },
      { label: "未確認", value: "原因、補償、部屋移動の可否" },
      { label: "出力", value: "フロント初期返信、160字以内" }
    ],
    examples: [],
    checklist: [
      "初期返信を作る目的が明確",
      "滞在中のチャット対応という背景が入っている",
      "原因や補償を断定しない指定がある",
      "短いチャット文の形式が指定されている",
      "不安を和らげる接客トーンが指定されている"
    ],
    hint:
      "未確認のことを約束せず、「ご不快な思いへのお詫び」「確認します」「少々お待ちください」を含めると安全です。",
    badExample: "隣の部屋がうるさい人に返事して。",
    starterPrompt:
      "目的: 滞在中のお客様へ、フロントから送る初期返信チャット文を作ってください。\n\n背景:\n- お客様は22時ごろ、隣室の話し声が気になると連絡しています。\n- 客室内チャットで返信します。\n- 原因、補償、部屋移動の可否はまだ確認できていません。\n\n制約:\n- 部屋番号や個人情報は入れないでください。\n- 原因や補償を断定しないでください。\n- すぐ解決できると約束しないでください。\n\n出力形式:\n- 160字以内\n- お詫び、状況確認、スタッフが確認する旨を含める\n- 落ち着いた丁寧なホテル接客のトーン"
  }
];

export const fewShotExercises = [
  {
    id: "few-faq-tone",
    exerciseType: "few-shot",
    displayLabel: "Few-Shot 1",
    shortTitle: "FAQ文面統一",
    title: "館内FAQを同じトーンで整える",
    estimatedMinutes: 10,
    focus: "良い例を見せ、同じ型と丁寧さで新しいFAQ回答を作らせる",
    principles: ["目的", "例の使い方", "型の一貫性", "制約", "接客品質"],
    evaluationRubricIds: ["goal", "examples", "consistency", "constraints", "hospitality"],
    promptScenario:
      "ホテル公式サイトのFAQ回答を、既存の丁寧な文体にそろえたい場面です。AIにどのように依頼しますか？",
    sourceText:
      "新しく整えたい質問: チェックアウト後に荷物を預けられますか？ 条件や料金はホテルごとに異なるため断定しない。公式FAQなので短く、丁寧で分かりやすい表現にしたい。",
    referenceItems: [
      { label: "作りたいもの", value: "公式サイトFAQの回答文" },
      { label: "新しい質問", value: "チェックアウト後に荷物を預けられますか？" },
      { label: "注意", value: "条件や料金を断定しない" },
      { label: "出力", value: "例と同じ型、120字以内" }
    ],
    examples: [
      {
        label: "例1",
        input: "チェックイン前に荷物を預けられますか？",
        output:
          "チェックイン前のお荷物は、フロントにてお預かりできる場合がございます。ご到着時にスタッフへお声がけください。"
      },
      {
        label: "例2",
        input: "客室でWi-Fiは使えますか？",
        output:
          "館内では無料Wi-Fiをご利用いただけます。接続方法は客室内のご案内、またはフロントにてご確認ください。"
      }
    ],
    checklist: [
      "例をAIにまねる対象として示している",
      "新しい質問が明確",
      "例と同じ構成や丁寧さを指定している",
      "条件や料金を断定しない指定がある",
      "公式FAQらしい分かりやすさが指定されている"
    ],
    hint:
      "Few-Shotでは、例を貼るだけでなく「この例と同じ型・同じ丁寧さで」と明示すると効果が出ます。",
    badExample: "このFAQをいい感じに書いて。",
    starterPrompt:
      "目的: 公式サイトFAQの回答文を、下の例と同じ型・同じ丁寧さで作ってください。\n\nまねてほしい例:\nQ: チェックイン前に荷物を預けられますか？\nA: チェックイン前のお荷物は、フロントにてお預かりできる場合がございます。ご到着時にスタッフへお声がけください。\n\nQ: 客室でWi-Fiは使えますか？\nA: 館内では無料Wi-Fiをご利用いただけます。接続方法は客室内のご案内、またはフロントにてご確認ください。\n\n新しい質問:\nQ: チェックアウト後に荷物を預けられますか？\n\n制約:\n- 条件や料金は断定しないでください。\n- 120字以内にしてください。\n- 公式FAQとして、短く丁寧で分かりやすい日本語にしてください。\n\n出力形式:\nA: から始めて回答文だけを出してください。"
  },
  {
    id: "few-review-template",
    exerciseType: "few-shot",
    displayLabel: "Few-Shot 2",
    shortTitle: "口コミ返信型",
    title: "口コミ返信を同じ構成で作る",
    estimatedMinutes: 10,
    focus: "感謝・具体的な受け止め・再訪への言葉という型を例から再利用する",
    principles: ["目的", "例の使い方", "型の一貫性", "制約", "接客品質"],
    evaluationRubricIds: ["goal", "examples", "consistency", "constraints", "hospitality"],
    promptScenario:
      "口コミ返信の文体をホテル全体でそろえるため、2つの返信例をAIに示して新しい返信文を作らせます。どう依頼しますか？",
    sourceText:
      "新しい口コミ: 駅から近くて便利でした。スタッフの案内も丁寧でした。ただ、エレベーターの待ち時間が長く感じました。公開返信なので個人情報は入れない。改善完了や設備変更を断定しない。280字以内。",
    referenceItems: [
      { label: "型", value: "感謝 → 具体的な受け止め → 今後の参考 → 再訪への言葉" },
      { label: "新しい口コミ", value: "立地と案内は良い、エレベーター待ち時間が不満" },
      { label: "注意", value: "個人情報なし、改善完了を断定しない" },
      { label: "出力", value: "公開口コミ返信、280字以内" }
    ],
    examples: [
      {
        label: "例1",
        input: "部屋が清潔で快適でした。ただ、朝食会場が少し混雑していました。",
        output:
          "このたびはご宿泊いただき、誠にありがとうございます。客室について温かいお言葉を頂戴し、大変うれしく存じます。一方で朝食会場の混雑によりご不便をおかけし申し訳ございません。いただいたご意見は今後の運営の参考にしてまいります。またのお越しを心よりお待ちしております。"
      },
      {
        label: "例2",
        input: "フロントの対応が丁寧でした。夜に廊下の音が少し気になりました。",
        output:
          "このたびは当ホテルをご利用いただき、誠にありがとうございます。スタッフ対応へのお言葉を励みにしてまいります。廊下の音につきましては、ご滞在中にご不快な思いをおかけし申し訳ございません。より快適にお過ごしいただけるよう、いただいたお声を参考にいたします。"
      }
    ],
    checklist: [
      "2つの例をまねる対象として示している",
      "新しい口コミの良い点と不満点が入っている",
      "例と同じ流れを指定している",
      "改善完了を断定しない指定がある",
      "公開返信として丁寧で誠実なトーンが指定されている"
    ],
    hint:
      "例の構成を名前で指定すると、AIがどこをまねればよいか分かりやすくなります。",
    badExample: "この口コミに返信して。例も参考にして。",
    starterPrompt:
      "目的: 新しい口コミへの公開返信文を、下の2つの例と同じ構成・同じ丁寧さで作ってください。\n\nまねてほしい型:\n感謝 → 良い点への具体的なお礼 → 不満点へのお詫び → 今後の参考にする姿勢 → 再訪への言葉\n\n例1:\n口コミ: 部屋が清潔で快適でした。ただ、朝食会場が少し混雑していました。\n返信: このたびはご宿泊いただき、誠にありがとうございます。客室について温かいお言葉を頂戴し、大変うれしく存じます。一方で朝食会場の混雑によりご不便をおかけし申し訳ございません。いただいたご意見は今後の運営の参考にしてまいります。またのお越しを心よりお待ちしております。\n\n例2:\n口コミ: フロントの対応が丁寧でした。夜に廊下の音が少し気になりました。\n返信: このたびは当ホテルをご利用いただき、誠にありがとうございます。スタッフ対応へのお言葉を励みにしてまいります。廊下の音につきましては、ご滞在中にご不快な思いをおかけし申し訳ございません。より快適にお過ごしいただけるよう、いただいたお声を参考にいたします。\n\n新しい口コミ:\n駅から近くて便利でした。スタッフの案内も丁寧でした。ただ、エレベーターの待ち時間が長く感じました。\n\n制約:\n- 個人情報は入れないでください。\n- 改善完了や設備変更を断定しないでください。\n- 280字以内にしてください。"
  },
  {
    id: "few-frontdesk-guide",
    exerciseType: "few-shot",
    displayLabel: "Few-Shot 3",
    shortTitle: "館内案内チャット",
    title: "館内案内チャットを同じ型で作る",
    estimatedMinutes: 10,
    focus: "案内チャットの短い型を例から学ばせ、別の案内文へ展開する",
    principles: ["目的", "例の使い方", "型の一貫性", "制約", "接客品質"],
    evaluationRubricIds: ["goal", "examples", "consistency", "constraints", "hospitality"],
    promptScenario:
      "客室内チャットで使う短い案内文を、既存の文体にそろえて作りたい場面です。AIにどう依頼しますか？",
    sourceText:
      "新しく作りたい案内: 大浴場の場所と利用時間を尋ねられたときの返信。ただし正確な営業時間は施設により異なるため、AIに具体的な時刻を作らせない。場所は「館内案内またはフロントで確認」と表現する。短く、親切に、最後に不明点があればフロントへ案内する。",
    referenceItems: [
      { label: "媒体", value: "客室内チャット" },
      { label: "新しい案内", value: "大浴場の場所と利用時間" },
      { label: "注意", value: "具体的な時刻や場所を作らない" },
      { label: "出力", value: "例と同じ短いチャット文、140字以内" }
    ],
    examples: [
      {
        label: "例1",
        input: "製氷機の場所を聞かれた",
        output:
          "製氷機の場所は館内案内にてご確認いただけます。分かりにくい場合は、フロントまでお気軽にお声がけください。"
      },
      {
        label: "例2",
        input: "タクシー手配について聞かれた",
        output:
          "タクシーの手配をご希望の場合は、フロントにて承ります。ご希望のお時間がございましたら、スタッフへお知らせください。"
      }
    ],
    checklist: [
      "例と同じ短いチャット文にする指定がある",
      "新しい案内内容が明確",
      "具体的な時刻や場所を作らない指定がある",
      "最後の案内先が指定されている",
      "親切で落ち着いた接客トーンが指定されている"
    ],
    hint:
      "Few-Shotでは、例の長さ・語尾・最後の案内先までそろえるように書くと、出力が安定します。",
    badExample: "大浴場の案内を作って。例みたいに。",
    starterPrompt:
      "目的: 客室内チャットで使う案内文を、下の例と同じ短さ・同じ丁寧さで作ってください。\n\nまねてほしい例:\n状況: 製氷機の場所を聞かれた\n返信: 製氷機の場所は館内案内にてご確認いただけます。分かりにくい場合は、フロントまでお気軽にお声がけください。\n\n状況: タクシー手配について聞かれた\n返信: タクシーの手配をご希望の場合は、フロントにて承ります。ご希望のお時間がございましたら、スタッフへお知らせください。\n\n新しい状況:\n大浴場の場所と利用時間を尋ねられた。\n\n制約:\n- 具体的な時刻や場所は作らないでください。\n- 場所や時間は「館内案内またはフロントで確認」と表現してください。\n- 140字以内にしてください。\n- 親切で落ち着いたホテル接客のトーンにしてください。\n\n出力形式:\n返信文だけを出してください。"
  }
];

export const exerciseGroups = [
  {
    id: "zero-shot",
    label: "Zero-Shot",
    title: "Zero-Shotプロンプティング",
    description: "例を入れず、目的・背景・制約・出力形式を整理してAIに依頼します。",
    exercises: zeroShotExercises
  },
  {
    id: "few-shot",
    label: "Few-Shot",
    title: "Few-Shotプロンプティング",
    description: "良い例を示し、同じ型やトーンでAIに新しい出力を作らせます。",
    exercises: fewShotExercises
  }
];

export const basicSteps = zeroShotExercises;
export const caseStudies = fewShotExercises;
export const lessons = zeroShotExercises;

export function getExerciseGroupById(groupId) {
  return exerciseGroups.find((group) => group.id === groupId) || null;
}

export function getExerciseById(exerciseType, exerciseId) {
  const group = getExerciseGroupById(exerciseType);
  return group?.exercises.find((exercise) => exercise.id === exerciseId) || null;
}

export function getAnyExerciseById(exerciseId) {
  for (const group of exerciseGroups) {
    const exercise = group.exercises.find((item) => item.id === exerciseId);
    if (exercise) return exercise;
  }
  return null;
}

export function getBasicStepById(stepId) {
  return getExerciseById("zero-shot", stepId);
}

export function getCaseStudyById(caseId) {
  return getExerciseById("few-shot", caseId);
}

export function getLessonById(lessonId) {
  return getBasicStepById(lessonId);
}

export function getScenarioById(lesson, scenarioId) {
  if (!lesson || scenarioId !== `${lesson.id}-scenario`) return null;
  return {
    id: scenarioId,
    title: lesson.title,
    audience: "ホテル専門学生",
    referenceItems: lesson.referenceItems,
    sourceText: lesson.sourceText,
    starterPrompt: lesson.starterPrompt
  };
}

export function getLessonSummaries() {
  return lessons;
}

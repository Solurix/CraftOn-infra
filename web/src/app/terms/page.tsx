import { LegalPage, type LegalContent } from "@/components/LegalPage";

const UPDATED = "2026-06-30";

const ja: LegalContent = {
  title: "利用規約",
  updated: `最終更新日: ${UPDATED}`,
  intro:
    "本利用規約（以下「本規約」）は、CRAFT-ON（以下「当社」）が提供する建設現場のスポットワーク マッチングサービス（以下「本サービス」）の利用条件を定めるものです。利用者は、本サービスを利用することで本規約に同意したものとみなされます。",
  sections: [
    {
      heading: "サービス概要",
      body: [
        "本サービスは、職人（一人親方を含む）と元請・現場監督（以下「発注者」）を、日雇い・スポットの建設作業についてマッチングするプラットフォームです。当社は雇用・請負の当事者とはならず、当事者間の契約成立・履行の場を提供します。",
      ],
    },
    {
      heading: "アカウント登録",
      body: [
        "登録時にはSMS（電話番号）による本人確認を行います。利用者は正確な情報（氏名・連絡先・職種等）を提供し、これを最新に保つものとします。",
        "パスワードおよびアカウントの管理は利用者の責任とし、第三者への貸与・譲渡を禁止します。",
      ],
    },
    {
      heading: "就労資格（在留資格）",
      body: [
        "外国籍の利用者は、在留カード等により就労が認められていることを確認できる場合に限り、本サービスで仕事に確定できます。在留資格の有効期限が切れている場合、応募・確定は制限されます。これは当社の唯一の必須コンプライアンス要件です。",
      ],
    },
    {
      heading: "募集・応募・確定",
      body: [
        "発注者は、職種・作業日・時間・現場・日当・募集人数等を明示して求人を掲載します。職人は求人に応募し、発注者の確定によりマッチングが成立します。",
        "確定時に契約区分（雇用者は日雇労働、一人親方は業務委託）が記録され、人が読める契約文面が生成されます。当該文面は暫定であり、専門家の確認待ちです。",
      ],
    },
    {
      heading: "報酬・手数料",
      body: [
        "報酬は日本円（整数）で表示され、フェーズ1では現場での現金払いを基本とします。当社は成立した1マッチングあたり所定のプラットフォーム手数料を記録します（アプリ内決済は後続フェーズで提供予定）。",
      ],
    },
    {
      heading: "チェックイン・完了・レビュー",
      body: [
        "職人は当日に到着（チェックイン）と作業完了を申請し、発注者が完了を承認します。完了後、双方が相互にレビュー（評価・コメント）を行うことができ、信頼スコアに反映されます。",
      ],
    },
    {
      heading: "連絡先のマスキング（中抜き防止）",
      body: [
        "本サービス内のチャットでは、電話番号・メールアドレス・SNS ID等の連絡先がサーバー側でマスキング（フィルタ）されます。当社を介さずに取引を行うこと（中抜き）、および不当なキャンセル・無断不参加（ドタキャン）は、本サービスの中核的価値を損なう行為として禁止します。",
      ],
    },
    {
      heading: "禁止事項",
      body: [
        "法令違反、他の利用者・第三者の権利侵害、虚偽情報の登録、安全衛生上の指示違反、当社の運営を妨害する行為を禁止します。違反があった場合、当社はアカウントの停止・解除等の措置を講じることがあります。",
      ],
    },
    {
      heading: "免責事項",
      body: [
        "当社は当事者間の契約の成立・履行・品質・支払いについて保証しません。本サービスは現状有姿で提供され、当社の責任は適用法令で認められる範囲に限定されます。",
      ],
    },
    {
      heading: "規約の変更・準拠法",
      body: [
        "当社は必要に応じて本規約を変更できます。重要な変更は本サービス上で通知します。本規約は日本法に準拠し、紛争は東京地方裁判所を専属的合意管轄とします。",
        "※本文面はフェーズ1向けの暫定版であり、専門家（弁護士・社労士・税理士）の確認後に確定します。",
      ],
    },
  ],
};

const en: LegalContent = {
  title: "Terms of Service",
  updated: `Last updated: ${UPDATED}`,
  intro:
    "These Terms of Service (the \"Terms\") govern your use of the construction-site spot-work matching service (the \"Service\") provided by CRAFT-ON (\"we\"). By using the Service you agree to these Terms.",
  sections: [
    {
      heading: "The Service",
      body: [
        "The Service is a platform that matches tradespeople (including sole proprietors) with contractors and site supervisors (\"Orderers\") for day and spot construction work. We are not a party to the employment or subcontract; we provide the venue for the parties to form and perform their own contracts.",
      ],
    },
    {
      heading: "Accounts",
      body: [
        "Registration requires phone-number verification by SMS. You must provide accurate information (name, contact, trades, etc.) and keep it up to date.",
        "You are responsible for safeguarding your password and account and must not lend or transfer it to any third party.",
      ],
    },
    {
      heading: "Work permission (residence status)",
      body: [
        "Foreign-national users may be confirmed for work only where their permission to work can be verified (e.g. a valid residence card). Where residence status has expired, applying and confirmation are restricted. This is our one mandatory compliance requirement.",
      ],
    },
    {
      heading: "Posting, applying, confirming",
      body: [
        "Orderers post jobs specifying trade, date, time, site, daily wage and headcount. Workers apply, and a matching is formed when the Orderer confirms.",
        "On confirmation the contract type is recorded (day-labor employment for employees; subcontract for sole proprietors) and a human-readable terms document is generated. That wording is provisional pending professional review.",
      ],
    },
    {
      heading: "Payment and fees",
      body: [
        "Amounts are shown in integer Japanese yen and, in Phase 1, are paid in cash on site. We record a platform fee per completed match (in-app payment arrives in a later phase).",
      ],
    },
    {
      heading: "Check-in, completion, reviews",
      body: [
        "Workers report arrival (check-in) and completion on the day; the Orderer approves completion. After completion both parties may leave reviews (rating and comment), which feed a trust score.",
      ],
    },
    {
      heading: "Contact masking (anti-disintermediation)",
      body: [
        "In-app chat masks contact details (phone numbers, email, social IDs) server-side. Transacting off-platform to bypass the Service (中抜き) and unjustified cancellations or no-shows (ドタキャン) are prohibited as they undermine the core value of the Service.",
      ],
    },
    {
      heading: "Prohibited conduct",
      body: [
        "You must not break the law, infringe others' rights, register false information, ignore site safety instructions, or interfere with our operation. We may suspend or terminate accounts for violations.",
      ],
    },
    {
      heading: "Disclaimer",
      body: [
        "We do not guarantee the formation, performance, quality or payment of contracts between the parties. The Service is provided \"as is\" and our liability is limited to the extent permitted by applicable law.",
      ],
    },
    {
      heading: "Changes and governing law",
      body: [
        "We may amend these Terms; material changes will be notified in the Service. These Terms are governed by the laws of Japan and disputes are subject to the exclusive jurisdiction of the Tokyo District Court.",
        "Note: this is a provisional Phase-1 draft, to be finalized after review by qualified professionals (legal/social-insurance/tax).",
      ],
    },
  ],
};

export default function TermsPage() {
  return <LegalPage ja={ja} en={en} />;
}

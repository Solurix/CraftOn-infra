import { LegalPage, type LegalContent } from "@/components/LegalPage";

const UPDATED = "2026-06-30";

const ja: LegalContent = {
  title: "プライバシーポリシー",
  updated: `最終更新日: ${UPDATED}`,
  intro:
    "CRAFT-ON（以下「当社」）は、個人情報の保護に関する法律（APPI）その他の関係法令を遵守し、利用者の個人情報を適切に取り扱います。",
  sections: [
    {
      heading: "取得する情報",
      body: [
        "氏名・電話番号・メールアドレス・ユーザー名、職種・資格・勤務地等のプロフィール情報、在留カード等の本人確認書類、求人・応募・マッチング・チャット・レビューに関する利用履歴を取得します。",
        "当社はマイナンバーを取得・保管しません。",
      ],
    },
    {
      heading: "利用目的",
      body: [
        "本サービスの提供（マッチング、本人確認・審査、就労資格の確認）、安全・不正防止、連絡先マスキングの実施、品質向上、法令上の義務の履行のために利用します。",
      ],
    },
    {
      heading: "保管と安全管理",
      body: [
        "本人確認書類等の画像は暗号化されたクラウドストレージに保管し、署名付きURLによりアクセスを制限します。在留カード等の機微な書類は必要な期間に限り保持し、不要となった後は適切に削除します。",
      ],
    },
    {
      heading: "第三者提供",
      body: [
        "法令に基づく場合、または本サービスの提供に必要な範囲（マッチング相手への必要最小限のプロフィール表示等）を除き、本人の同意なく個人情報を第三者に提供しません。連絡先はサーバー側でマスキングされます。",
      ],
    },
    {
      heading: "開示・訂正・利用停止",
      body: [
        "利用者は、自己の個人情報の開示・訂正・利用停止・削除を求めることができます。アカウント設定から登録情報を変更できるほか、お問い合わせ窓口を通じて請求できます。",
      ],
    },
    {
      heading: "改定・お問い合わせ",
      body: [
        "本ポリシーは必要に応じて改定し、重要な変更は本サービス上で通知します。本ポリシーは日本法に準拠します。",
        "※本文面はフェーズ1向けの暫定版であり、専門家の確認後に確定します。",
      ],
    },
  ],
};

const en: LegalContent = {
  title: "Privacy Policy",
  updated: `Last updated: ${UPDATED}`,
  intro:
    "CRAFT-ON (\"we\") handles your personal information appropriately, in compliance with Japan's Act on the Protection of Personal Information (APPI) and other applicable laws.",
  sections: [
    {
      heading: "Information we collect",
      body: [
        "Name, phone number, email, username; profile data such as trades, qualifications and location; identity documents such as residence cards; and activity data relating to jobs, applications, matchings, chat and reviews.",
        "We do not collect or store My Number.",
      ],
    },
    {
      heading: "How we use it",
      body: [
        "To provide the Service (matching, identity vetting, work-permission checks), for safety and fraud prevention, to apply contact masking, to improve quality, and to meet legal obligations.",
      ],
    },
    {
      heading: "Storage and security",
      body: [
        "Identity-document images are stored in encrypted cloud storage with access restricted via short-lived signed URLs. Sensitive documents such as residence cards are retained only as long as needed and deleted appropriately thereafter.",
      ],
    },
    {
      heading: "Disclosure to third parties",
      body: [
        "We do not provide personal information to third parties without consent, except as required by law or to the minimum extent necessary to provide the Service (e.g. showing a minimal profile to a matched counterpart). Contact details are masked server-side.",
      ],
    },
    {
      heading: "Access, correction and deletion",
      body: [
        "You may request access to, correction of, suspension of use of, or deletion of your personal information. You can change your registered details in account settings, or make a request through our contact channel.",
      ],
    },
    {
      heading: "Changes and contact",
      body: [
        "We may revise this Policy; material changes will be notified in the Service. This Policy is governed by the laws of Japan.",
        "Note: this is a provisional Phase-1 draft, to be finalized after professional review.",
      ],
    },
  ],
};

export default function PrivacyPage() {
  return <LegalPage ja={ja} en={en} />;
}

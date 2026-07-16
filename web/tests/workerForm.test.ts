import { describe, expect, it } from "vitest";

import { emptyWorkerForm, workerFormToPayload } from "@/lib/workerForm";

describe("workerFormToPayload residence-card doc ids", () => {
  it("omits the doc-id keys when nothing was uploaded (PATCH must not clobber)", () => {
    const payload = workerFormToPayload(emptyWorkerForm());
    expect("residence_card_front_doc_id" in payload).toBe(false);
    expect("residence_card_back_doc_id" in payload).toBe(false);
  });

  it("sends only the sides that were (re)uploaded in this session", () => {
    const form = {
      ...emptyWorkerForm(),
      nationality: "VN",
      residence_card_front_doc_id: "doc-front-1",
    };
    const payload = workerFormToPayload(form);
    expect(payload.residence_card_front_doc_id).toBe("doc-front-1");
    expect("residence_card_back_doc_id" in payload).toBe(false);
  });
});

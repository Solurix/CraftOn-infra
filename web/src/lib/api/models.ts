// Single source of truth for API types: derived from the generated OpenAPI
// schema (run `npm run gen:api` to refresh from the backend's /openapi.json).
import type { components } from "./schema";

type S = components["schemas"];

export type Me = S["MeOut"];
export type User = S["UserOut"];
export type WorkerProfile = S["WorkerProfileOut"];
export type ContractorProfile = S["ContractorProfileOut"];
export type WorkerPublic = S["WorkerPublicOut"];
export type ContractorPublic = S["ContractorPublicOut"];
export type Job = S["JobOut"];
export type JobCreate = S["JobCreate"];
export type JobUpdate = S["JobUpdate"];
export type Application = S["ApplicationOut"];
export type Applicant = S["ApplicantOut"];
export type Matching = S["MatchingOut"];
export type Message = S["MessageOut"];
export type Review = S["ReviewOut"];
export type ReviewCreate = S["ReviewCreate"];
export type WorkerOnboarding = S["WorkerOnboardingIn"];
export type ContractorOnboarding = S["ContractorOnboardingIn"];
export type WorkerUpdate = S["WorkerProfileUpdate"];
export type ContractorUpdate = S["ContractorProfileUpdate"];
export type SessionCreate = S["SessionCreateIn"];
export type SessionResult = S["SessionOut"];
export type DocumentOut = S["DocumentOut"];
export type DocumentWithUrl = S["DocumentWithUrlOut"];
export type UploadUrl = S["UploadUrlOut"];
export type ConfigSnapshot = S["ConfigOut"];
export type VettingQueue = S["VettingQueueOut"];
export type VettingItem = S["VettingItem"];
export type Notification = S["NotificationOut"];
export type WorkHistory = S["WorkHistoryOut"];
export type Login = S["LoginOut"];
export type Device = S["DeviceOut"];
export type Trade = S["TradeOut"];
export type CustomTrade = S["CustomTradeOut"];
export type TradeMergeResult = S["TradeMergeOut"];
export type JobPhoto = S["JobPhotoOut"];

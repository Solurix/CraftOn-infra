// Typed API client: one method per endpoint, built on the transport layer in
// ./request (which injects the bearer token and surfaces the backend's
// `{error:{code,message}}` envelope as ApiError).
import type {
  Applicant,
  Application,
  ConfigSnapshot,
  ContractorOnboarding,
  ContractorProfile,
  ContractorPublic,
  ContractorUpdate,
  CustomTrade,
  Device,
  DocumentOut,
  DocumentWithUrl,
  Job,
  JobCreate,
  JobPhoto,
  JobUpdate,
  Login,
  Matching,
  Me,
  Message,
  Notification,
  Review,
  ReviewCreate,
  SessionCreate,
  SessionResult,
  Trade,
  TradeMergeResult,
  UploadUrl,
  User,
  VettingQueue,
  WorkerOnboarding,
  WorkerProfile,
  WorkerPublic,
  WorkerUpdate,
  WorkHistory,
} from "./models";
import { request } from "./request";

// Re-export the transport-layer pieces importers rely on so existing
// `@/lib/api/client` imports keep working unchanged.
export { API_BASE, ApiError, AUTH_EXPIRED_EVENT } from "./request";

export class ApiClient {
  constructor(private token: string | null = null) {}

  withToken(token: string | null): ApiClient {
    return new ApiClient(token);
  }

  // auth / session
  createSession(body: SessionCreate) {
    return request<SessionResult>("/auth/session", { method: "POST", body, token: this.token });
  }
  me() {
    return request<Me>("/me", { token: this.token });
  }
  setPassword(password: string) {
    return request<void>("/auth/password", { method: "POST", body: { password }, token: this.token });
  }
  // Returning login with any identifier (username / email / phone) + password.
  login(identifier: string, password: string) {
    return request<Login>("/auth/login", {
      method: "POST",
      body: { identifier, password },
    });
  }
  // Forgot-password: this client must hold the freshly-minted OTP token (proves
  // phone ownership); the API sets the new password and returns a session token.
  resetPassword(password: string) {
    return request<Login>("/auth/reset-password", {
      method: "POST",
      body: { password },
      token: this.token,
    });
  }
  // Change own login identifiers (username / email) from account settings.
  updateAccount(body: { username?: string; email?: string }) {
    return request<User>("/me/account", { method: "PATCH", body, token: this.token });
  }

  // devices
  myDevices() {
    return request<Device[]>("/me/devices", { token: this.token });
  }
  revokeDevice(id: string) {
    return request<Device>(`/me/devices/${id}/revoke`, { method: "POST", token: this.token });
  }
  adminDevices() {
    return request<Device[]>("/admin/devices", { token: this.token });
  }

  // onboarding / profiles
  onboardWorker(body: WorkerOnboarding) {
    return request<WorkerProfile>("/onboarding/worker", { method: "POST", body, token: this.token });
  }
  onboardContractor(body: ContractorOnboarding) {
    return request<ContractorProfile>("/onboarding/contractor", { method: "POST", body, token: this.token });
  }
  updateWorker(body: WorkerUpdate) {
    return request<WorkerProfile>("/workers/me", { method: "PATCH", body, token: this.token });
  }
  updateContractor(body: ContractorUpdate) {
    return request<ContractorProfile>("/contractors/me", { method: "PATCH", body, token: this.token });
  }
  worker(id: string) {
    return request<WorkerPublic>(`/workers/${id}`, { token: this.token });
  }
  workerPhotos(id: string) {
    return request<DocumentWithUrl[]>(`/workers/${id}/photos`, { token: this.token });
  }
  contractor(id: string) {
    return request<ContractorPublic>(`/contractors/${id}`, { token: this.token });
  }

  // documents
  uploadUrl(docType: string, contentType = "image/jpeg") {
    return request<UploadUrl>("/documents/upload-url", {
      method: "POST", body: { doc_type: docType, content_type: contentType }, token: this.token,
    });
  }
  registerDocument(docType: string, storagePath: string) {
    return request<DocumentOut>("/documents", {
      method: "POST", body: { doc_type: docType, storage_path: storagePath }, token: this.token,
    });
  }
  myDocuments() {
    return request<DocumentOut[]>("/documents/me", { token: this.token });
  }
  documentViewUrl(id: string) {
    return request<DocumentWithUrl>(`/documents/${id}/view-url`, { token: this.token });
  }

  // trades catalog
  trades() {
    return request<Trade[]>("/trades", { token: this.token });
  }
  jobPhotos(jobId: string) {
    return request<JobPhoto[]>(`/jobs/${jobId}/photos`, { token: this.token });
  }

  // jobs
  jobs(query?: {
    trade?: string;
    prefecture?: string;
    work_date?: string;
    wage_min?: string;
    wage_max?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
  }) {
    return request<Job[]>("/jobs", { token: this.token, query });
  }
  job(id: string) {
    return request<Job>(`/jobs/${id}`, { token: this.token });
  }
  myJobs() {
    return request<Job[]>("/jobs/mine", { token: this.token });
  }
  savedJobs() {
    return request<Job[]>("/jobs/saved", { token: this.token });
  }
  savedJobIds() {
    return request<string[]>("/jobs/saved-ids", { token: this.token });
  }
  saveJob(id: string) {
    return request<void>(`/jobs/${id}/save`, { method: "PUT", token: this.token });
  }
  unsaveJob(id: string) {
    return request<void>(`/jobs/${id}/save`, { method: "DELETE", token: this.token });
  }
  createJob(body: JobCreate) {
    return request<Job>("/jobs", { method: "POST", body, token: this.token });
  }
  updateJob(id: string, body: JobUpdate) {
    return request<Job>(`/jobs/${id}`, { method: "PATCH", body, token: this.token });
  }
  cancelJob(id: string) {
    return request<Job>(`/jobs/${id}/cancel`, { method: "POST", token: this.token });
  }

  // applications
  apply(jobId: string) {
    return request<Application>(`/jobs/${jobId}/apply`, { method: "POST", token: this.token });
  }
  applicants(jobId: string) {
    return request<Applicant[]>(`/jobs/${jobId}/applications`, { token: this.token });
  }
  myApplications() {
    return request<Application[]>("/applications/mine", { token: this.token });
  }
  confirm(applicationId: string) {
    return request<Matching>(`/applications/${applicationId}/confirm`, { method: "POST", token: this.token });
  }
  rejectApplication(applicationId: string) {
    return request<Application>(`/applications/${applicationId}/reject`, { method: "POST", token: this.token });
  }
  withdraw(applicationId: string) {
    return request<Application>(`/applications/${applicationId}/withdraw`, { method: "POST", token: this.token });
  }

  // matchings
  myMatchings() {
    return request<Matching[]>("/matchings/mine", { token: this.token });
  }
  workHistory() {
    return request<WorkHistory>("/matchings/history", { token: this.token });
  }
  matching(id: string) {
    return request<Matching>(`/matchings/${id}`, { token: this.token });
  }
  checkIn(id: string) {
    return request<Matching>(`/matchings/${id}/check-in`, { method: "POST", token: this.token });
  }
  completeRequest(id: string) {
    return request<Matching>(`/matchings/${id}/complete-request`, { method: "POST", token: this.token });
  }
  approveCompletion(id: string) {
    return request<Matching>(`/matchings/${id}/approve-completion`, { method: "POST", token: this.token });
  }
  cancelMatching(id: string) {
    return request<Matching>(`/matchings/${id}/cancel`, { method: "POST", token: this.token });
  }

  // chat
  messages(matchingId: string) {
    return request<Message[]>(`/matchings/${matchingId}/messages`, { token: this.token });
  }
  sendMessage(matchingId: string, body: string) {
    return request<Message>(`/matchings/${matchingId}/messages`, { method: "POST", body: { body }, token: this.token });
  }

  // reviews
  leaveReview(matchingId: string, body: ReviewCreate) {
    return request<Review>(`/matchings/${matchingId}/reviews`, { method: "POST", body, token: this.token });
  }
  workerReviews(id: string) {
    return request<Review[]>(`/workers/${id}/reviews`, { token: this.token });
  }
  contractorReviews(id: string) {
    return request<Review[]>(`/contractors/${id}/reviews`, { token: this.token });
  }

  // notifications
  notifications(query?: { unread_only?: string }) {
    return request<Notification[]>("/notifications", { token: this.token, query });
  }
  unreadCount() {
    return request<{ count: number }>("/notifications/unread-count", { token: this.token });
  }
  markNotificationRead(id: string) {
    return request<Notification>(`/notifications/${id}/read`, { method: "POST", token: this.token });
  }
  markAllNotificationsRead() {
    return request<{ updated: number }>("/notifications/read-all", { method: "POST", token: this.token });
  }

  // admin
  vettingQueue() {
    return request<VettingQueue>("/admin/vetting/queue", { token: this.token });
  }
  adminUsers(query?: { user_type?: string; status?: string }) {
    return request<VettingQueue>("/admin/users", { token: this.token, query });
  }
  adminJobs(query?: { status?: string }) {
    return request<Job[]>("/admin/jobs", { token: this.token, query });
  }
  adminMatchings(query?: { status?: string; fee_status?: string }) {
    return request<Matching[]>("/admin/matchings", { token: this.token, query });
  }
  markFeePaid(matchingId: string) {
    return request<Matching>(`/admin/matchings/${matchingId}/mark-fee-paid`, { method: "POST", token: this.token });
  }
  adminAdmins() {
    return request<User[]>("/admin/admins", { token: this.token });
  }
  createAdmin(body: {
    phone_number: string;
    username: string;
    email: string;
    password: string;
    display_name: string;
  }) {
    return request<User>("/admin/admins", { method: "POST", body, token: this.token });
  }
  debugSeed(body: { workers: number; contractors: number; jobs: number }) {
    return request<{ workers: number; contractors: number; jobs: number }>(
      "/admin/debug/seed",
      { method: "POST", body, token: this.token },
    );
  }
  approveUser(id: string) {
    return request<unknown>(`/admin/users/${id}/approve`, { method: "POST", token: this.token });
  }
  rejectUser(id: string, reason?: string) {
    return request<unknown>(`/admin/users/${id}/reject`, { method: "POST", body: { reason }, token: this.token });
  }
  suspendUser(id: string, suspend: boolean) {
    return request<unknown>(`/admin/users/${id}/suspend`, { method: "POST", body: { suspend }, token: this.token });
  }
  adminTrades() {
    return request<Trade[]>("/admin/trades", { token: this.token });
  }
  createTrade(body: { name_ja: string; name_en: string; sort_order?: number }) {
    return request<Trade>("/admin/trades", { method: "POST", body, token: this.token });
  }
  updateTrade(id: string, body: { name_ja?: string; name_en?: string; active?: boolean; sort_order?: number }) {
    return request<Trade>(`/admin/trades/${id}`, { method: "PATCH", body, token: this.token });
  }
  customTrades() {
    return request<CustomTrade[]>("/admin/trades/custom", { token: this.token });
  }
  mergeTrade(fromName: string, intoTradeId: string) {
    return request<TradeMergeResult>("/admin/trades/merge", {
      method: "POST", body: { from_name: fromName, into_trade_id: intoTradeId }, token: this.token,
    });
  }
  readConfig() {
    return request<ConfigSnapshot>("/admin/config", { token: this.token });
  }
  updateConfig(updates: Record<string, unknown>) {
    return request<ConfigSnapshot>("/admin/config", { method: "PATCH", body: { updates }, token: this.token });
  }
}

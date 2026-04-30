export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  HIDDEN = 'HIDDEN',
}

export enum ReviewInteractionType {
  LIKE = 'LIKE',
  REPORT = 'REPORT',
}

export enum ReviewReportReason {
  SPAM = 'SPAM',
  OFFENSIVE = 'OFFENSIVE',
  FAKE = 'FAKE',
}

export enum ReviewEventType {
  REVIEW_SUBMITTED = 'REVIEW_SUBMITTED',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_REPORTED = 'REVIEW_REPORTED',
}

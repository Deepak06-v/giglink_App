# Review Package — Tasks 1-2

## Base: 128107b
## Head: 517832b

## Commit List
517832b fix(review): decouple review eligibility from job.COMPLETED status

## Stat Summary
 backend/src/services/review.service.js | 34 ++++++++++++++++------------------
 1 file changed, 16 insertions(+), 18 deletions(-)

## Full Diff
diff --git a/backend/src/services/review.service.js b/backend/src/services/review.service.js
index a41f267..7d9c51d 100644
--- a/backend/src/services/review.service.js
+++ b/backend/src/services/review.service.js
@@ -251,11 +251,13 @@ const checkEmployerReviewEligibility = async (employerId, jobId) => {
     throw error;
   }
 
-  if (job.status !== "COMPLETED") {
-    return {
-      canReview: false,
-      workers: [],
-    };
+  if (job.status === "CANCELLED") {
+    return { canReview: false, workers: [] };
+  }
+
+  // Employer can review once THEY have confirmed completion
+  if (!job.completion?.employerCompleted) {
+    return { canReview: false, workers: [] };
   }
 
   const assignments = await Assignment.find({
@@ -280,10 +282,7 @@ const checkEmployerReviewEligibility = async (employerId, jobId) => {
 
   const canReview = workers.some((w) => !w.hasReviewed);
 
-  return {
-    canReview,
-    workers,
-  };
+  return { canReview, workers };
 };
 
 const checkWorkerReviewEligibility = async (workerId, jobId) => {
@@ -294,11 +293,8 @@ const checkWorkerReviewEligibility = async (workerId, jobId) => {
     throw error;
   }
 
-  if (job.status !== "COMPLETED") {
-    return {
-      canReview: false,
-      hasReviewed: false,
-    };
+  if (job.status === "CANCELLED") {
+    return { canReview: false, hasReviewed: false };
   }
 
   const assignment = await Assignment.findOne({
@@ -308,10 +304,12 @@ const checkWorkerReviewEligibility = async (workerId, jobId) => {
   }).lean();
 
   if (!assignment) {
-    return {
-      canReview: false,
-      hasReviewed: false,
-    };
+    return { canReview: false, hasReviewed: false };
+  }
+
+  // Worker can review once THEY have completed their assignment
+  if (!assignment.workerCompleted) {
+    return { canReview: false, hasReviewed: false };
   }
 
   const existingReview = await Review.findOne({

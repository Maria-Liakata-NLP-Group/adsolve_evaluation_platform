/** @format */

import { useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useEvaluationJob } from "../../../hooks/useEvaluationJob";
import { useAdmin } from "../../../hooks/useAdmin";

const STATUS_LABELS = {
	queued: "Queued — waiting for the calculation service",
	running: "Running — metrics are being computed",
	failed: "Failed",
	succeeded: "Complete",
};

// Metric runs can take hours, so the panel explains that leaving is safe.
const EvaluationJobStatus = ({ jobId, useCaseId, pathId, onDone }) => {
	const { token } = useAdmin();
	const { job, error } = useEvaluationJob(jobId, token);
	const navigate = useNavigate();

	// The run only exists once results have been ingested.
	useEffect(() => {
		if (job?.run_id) navigate(`/runs/${useCaseId}/${pathId}/${job.run_id}`);
	}, [job, useCaseId, pathId, navigate]);

	const status = job?.status ?? "queued";
	const isFailed = status === "failed";

	return (
		<section className="block job-status-panel">
			<h2 className="title is-5 mb-2">{job?.title ?? "Evaluation"}</h2>
			<p className={`job-status-line ${isFailed ? "is-failed" : ""}`}>
				{STATUS_LABELS[status] ?? status}
			</p>

			{!isFailed && (
				<p className="content is-small">
					This can take a while. You can close this page — the results are
					saved as soon as the calculation finishes.
				</p>
			)}

			{isFailed && job?.error && <p className="text-error mb-3">{job.error}</p>}

			{error && (
				<p className="content is-small">
					Could not reach the platform for an update; retrying.
				</p>
			)}

			<p className="content is-small job-status-id">Job {jobId}</p>

			<button type="button" className="button" onClick={onDone}>
				{isFailed ? "Back" : "Run in background"}
			</button>
		</section>
	);
};

EvaluationJobStatus.propTypes = {
	jobId: PropTypes.string.isRequired,
	useCaseId: PropTypes.string.isRequired,
	pathId: PropTypes.string.isRequired,
	onDone: PropTypes.func.isRequired,
};

export default EvaluationJobStatus;

/** @format */

import { useEffect, useRef, useState } from "react";
import { getEvaluationJob } from "../api/evaluations";

// Statuses that will not change again, so polling can stop.
const TERMINAL_STATUSES = ["succeeded", "failed"];

export const POLL_INTERVAL_MS = 5000;

/**
 * Polls one evaluation job until it reaches a terminal state.
 * Returns { job, error } where job is null until the first response arrives.
 */
export const useEvaluationJob = (jobId, token) => {
	const [job, setJob] = useState(null);
	const [error, setError] = useState(null);
	// Held in a ref so the polling effect never restarts when the job updates.
	const timerRef = useRef(null);

	useEffect(() => {
		if (!jobId || !token) return undefined;

		let cancelled = false;

		const poll = async () => {
			try {
				const next = await getEvaluationJob(jobId, token);
				if (cancelled) return;
				setJob(next);
				setError(null);
				// Stop as soon as there is nothing left to wait for.
				if (!TERMINAL_STATUSES.includes(next.status)) {
					timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
				}
			} catch (err) {
				if (cancelled) return;
				// A transient failure should not end the run; keep polling.
				setError(err.message);
				timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
			}
		};

		poll();

		return () => {
			cancelled = true;
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [jobId, token]);

	return { job, error };
};

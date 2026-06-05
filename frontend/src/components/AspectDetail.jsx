/** @format */

import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { getAspect, getAspectPaths, deleteAspect } from "../api/config";
import { useAdmin } from "../hooks/useAdmin";
import AdminItemActions from "./AdminItemActions";
import AspectDetailEdit from "./AspectDetailEdit";
import AssociatedItems from "./AssociatedItems";
import ConfirmModal from "./ConfirmModal";
import DescriptionSection from "./DescriptionSection";
import PathAspectCard from "./PathAspectCard";

const AspectDetail = ({ aspectId, onNavigateToMetric, onNavigateToPath, onDeleted, onUpdated }) => {
  const { token } = useAdmin();
  const [detail, setDetail] = useState(null);
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!aspectId) return;
    setEditing(false);
    setDetail(null);
    setPaths([]);
    setDeleteError(null);
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [aspectData, pathData] = await Promise.all([
          getAspect(aspectId),
          getAspectPaths(aspectId),
        ]);
        setDetail(aspectData);
        setPaths(pathData);
      } catch {
        setDetail(null);
        setPaths([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [aspectId]);

  const canDelete = paths.length === 0;
  const blockingMessage = canDelete
    ? null
    : `Used in ${paths.length} path(s) — remove those links before deleting.`;

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteAspect(aspectId, token);
      onDeleted?.();
    } catch (err) {
      setDeleteError(err.message ?? "Delete failed. Please try again.");
    }
  };

  if (!detail && !loading) return null;

  if (editing) {
    return (
      <AspectDetailEdit
        aspect={detail}
        paths={paths}
        onSaved={(updated) => {
          setDetail(updated);
          setEditing(false);
          onUpdated?.({ id: aspectId, label: updated.label });
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
        <p className="is-size-7 has-text-grey is-uppercase" style={{ letterSpacing: "0.08em" }}>
          Aspect
        </p>
        <AdminItemActions
          canDelete={canDelete}
          blockingMessage={blockingMessage}
          onEdit={() => setEditing(true)}
          onDelete={() => setConfirmDelete(true)}
        />
      </div>

      <h2 className="title is-4" style={{ marginBottom: "1.5rem" }}>
        {detail?.label}
      </h2>

      {deleteError && (
        <p style={{ color: "#e07070", fontSize: "0.8rem", marginBottom: "1rem" }}>{deleteError}</p>
      )}

      <DescriptionSection description={detail?.description} />
      <AssociatedItems
        label="Associated Metrics"
        items={detail?.metrics ?? []}
        loading={loading}
        onItemClick={onNavigateToMetric}
      />

      <div style={{ marginTop: "2rem" }}>
        <p className="is-size-7 is-uppercase has-text-grey" style={{ letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
          Used in Tasks
        </p>
        {loading ? (
          <p className="has-text-grey is-italic">Loading…</p>
        ) : paths.length === 0 ? (
          <p className="has-text-grey is-italic">Not used in any paths yet.</p>
        ) : (
          <div className="columns is-multiline">
            {paths.map((path) => (
              <div key={path.path_id} className="column is-6">
                <PathAspectCard
                  label={detail?.label}
                  examples={path.examples}
                  stakeholderRequirements={path.stakeholder_requirements}
                  metrics={path.metrics}
                  onClick={onNavigateToPath ? () => onNavigateToPath(path.path_id) : undefined}
                >
                  <p className="is-size-7 has-text-grey mb-1">
                    {path.use_case_label} · {path.task_label}
                  </p>
                  <p className="has-text-weight-semibold mb-2">{path.data_source_label}</p>
                  {path.definition && <p className="is-size-7">{path.definition}</p>}
                </PathAspectCard>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete Aspect"
        message={`Are you sure you want to delete "${detail?.label}"? This cannot be undone.`}
        confirmLabel="Yes, delete aspect"
        onConfirm={() => { setConfirmDelete(false); handleDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
};

AspectDetail.propTypes = {
  aspectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onNavigateToMetric: PropTypes.func,
  onNavigateToPath: PropTypes.func,
  onDeleted: PropTypes.func,
  onUpdated: PropTypes.func,
};

export default AspectDetail;

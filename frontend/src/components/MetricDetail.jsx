/** @format */

import { useEffect, useState } from "react";
import { getMetric, deleteMetric } from "../api/config";
import { useAdmin } from "../hooks/useAdmin";
import AdminItemActions from "./AdminItemActions";
import AssociatedItems from "./AssociatedItems";
import ConfirmModal from "./ConfirmModal";
import DescriptionSection from "./DescriptionSection";
import MetricDetailEdit from "./MetricDetailEdit";

const toItems = (strings) => (strings ?? []).map((s) => ({ id: s, label: s }));

const MetricDetail = ({ metricId, onNavigateToAspect, onDeleted, onUpdated }) => {
  const { token } = useAdmin();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!metricId) return;
    setEditing(false);
    setDeleteError(null);
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await getMetric(metricId);
        setDetail(data);
      } catch {
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [metricId]);

  const canDelete = (detail?.aspects ?? []).length === 0;
  const blockingMessage = canDelete
    ? null
    : `Linked to ${detail.aspects.length} aspect(s) — remove those links before deleting.`;

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteMetric(metricId, token);
      onDeleted?.();
    } catch (err) {
      setDeleteError(err.message ?? "Delete failed. Please try again.");
    }
  };

  if (!detail && !loading) return null;

  if (editing) {
    return (
      <MetricDetailEdit
        metric={detail}
        onSaved={(updated) => {
          setDetail(updated);
          setEditing(false);
          onUpdated?.({ id: metricId, label: updated.label });
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
        <p className="is-size-7 has-text-grey is-uppercase" style={{ letterSpacing: "0.08em" }}>
          Metric
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
      <div style={{ marginBottom: "1rem" }}>
        <AssociatedItems label="Tags" items={toItems(detail?.tags)} loading={loading} />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <AssociatedItems label="Supported Reference Modes" items={toItems(detail?.supported_reference_modes)} loading={loading} />
      </div>
      <div style={{ marginBottom: "1.5rem" }}>
        <AssociatedItems label="Supported Compute Environments" items={toItems(detail?.supported_compute_environments)} loading={loading} />
      </div>
      <AssociatedItems label="Associated Aspects" items={detail?.aspects ?? []} loading={loading} onItemClick={onNavigateToAspect} />

      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete Metric"
        message={`Are you sure you want to delete "${detail?.label}"? This cannot be undone.`}
        confirmLabel="Yes, delete metric"
        onConfirm={() => { setConfirmDelete(false); handleDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
};

export default MetricDetail;

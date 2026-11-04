import { Alert, Button } from "../../shared/ui";
import { useProfileResource } from "./hooks/useProfileResource";
import { ProfileWorkspace } from "./workspace/ProfileWorkspace";

export function DoctorProfilePage() {
  const resource = useProfileResource();
  if (resource.loading) return <p role="status" aria-busy="true">Loading profile…</p>;
  if (resource.error || !resource.profile) return <Alert kind="error">
    <p>{resource.error || "Could not load your profile."}</p>
    <Button size="sm" variant="secondary" onClick={resource.reload}>Retry</Button>
  </Alert>;
  return <ProfileWorkspace profile={resource.profile} resource={resource} />;
}

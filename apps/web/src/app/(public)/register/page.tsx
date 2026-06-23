/**
 * Registration landing for authenticated-but-unprovisioned users. The actual
 * provisioning endpoint (`POST /v1/register-student`) is built in a later step
 * (Roadmap S2); this page only confirms the unprovisioned state is reachable.
 */
export default function RegisterPage() {
  return (
    <main>
      <h1>Complete your registration</h1>
      <p>
        Your account is signed in but not yet provisioned. Student provisioning ships in
        a later step.
      </p>
      <form method="post" action="/auth/logout">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}

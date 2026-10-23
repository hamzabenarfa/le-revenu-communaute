"use client";

import { useActionState } from "react";
import { loginWithForm } from "@/app/actions/auth";

/** No-JavaScript-friendly login (the modal is the main entry point). */
export function LoginPageForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginWithForm, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form
      action={action}
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && !Object.keys(errors).length && (
        <p className="err-msg" role="alert">
          {state.error}
        </p>
      )}
      <div className="field">
        <label htmlFor="identifier">Adresse e-mail</label>
        <input
          className={`input${errors.identifier ? " err" : ""}`}
          id="identifier"
          name="identifier"
          type="email"
          autoComplete="email"
          required
        />
        {errors.identifier && (
          <span className="err-msg">{errors.identifier}</span>
        )}
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input
          className={`input${errors.password ? " err" : ""}`}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {errors.password && <span className="err-msg">{errors.password}</span>}
      </div>
      <button
        className="btn btn-primary"
        type="submit"
        disabled={pending}
        aria-busy={pending}
      >
        Se connecter
      </button>
      <p className="hint" style={{ textAlign: "center" }}>
        Démo : <b>demo@demo.fr</b>, avec le même texte comme mot de passe.
      </p>
    </form>
  );
}

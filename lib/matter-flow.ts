export type MatterActor = "client" | "lawyer" | "both" | "none";

type FlowInput = {
  status: string;
  role: "client" | "lawyer";
  paymentStatus?: string;
  openClientTasks: number;
  openLawyerTasks: number;
  meetingTime?: string;
};

export function getMatterFlow(input: FlowInput) {
  const { status, role, openClientTasks, openLawyerTasks } = input;
  const base = {
    stage: status,
    actor: "none" as MatterActor,
    title: "Dossier à jour",
    detail: "Aucune action immédiate n’est nécessaire.",
    actionLabel: "Voir le dossier",
    actionTab: "overview" as "overview" | "messages" | "files" | "tasks",
  };
  if (status === "pending") return {
    ...base, actor: "lawyer" as const,
    title: role === "lawyer" ? "Étudiez et qualifiez la demande" : "L’avocat examine votre demande",
    detail: role === "lawyer" ? "Vérifiez la synthèse, les pièces et les éventuels conflits avant de décider." : "Vous n’avez rien à faire pour le moment. Vous serez informé de la décision.",
    actionLabel: role === "lawyer" ? "Prendre une décision" : "Consulter la synthèse",
  };
  if (status === "clarification_requested") return {
    ...base, actor: "client" as const,
    title: role === "client" ? "Une précision est attendue" : "En attente de la réponse du client",
    detail: role === "client" ? "Répondez dans la messagerie : votre réponse replacera automatiquement le dossier dans la file de l’avocat." : "La demande reviendra dans votre file dès que le client aura répondu.",
    actionLabel: "Ouvrir la messagerie", actionTab: "messages" as const,
  };
  if (status === "payment_pending") return {
    ...base, actor: "client" as const,
    title: role === "client" ? "Paiement nécessaire pour confirmer" : "En attente du paiement du client",
    detail: "Le rendez-vous sera confirmé automatiquement dès validation du paiement.",
    actionLabel: role === "client" ? "Payer la consultation" : "Voir le suivi",
  };
  if (status === "confirmed" && (openClientTasks || openLawyerTasks)) return {
    ...base, actor: openClientTasks && openLawyerTasks ? "both" as const : openClientTasks ? "client" as const : "lawyer" as const,
    title: "Préparez la consultation",
    detail: `${openClientTasks} action${openClientTasks === 1 ? "" : "s"} côté client · ${openLawyerTasks} côté avocat.`,
    actionLabel: "Voir la checklist", actionTab: "tasks" as const,
  };
  if (status === "confirmed") return {
    ...base, actor: "lawyer" as const,
    title: input.meetingTime ? `Consultation prévue ${input.meetingTime}` : "Consultation à venir",
    detail: role === "lawyer" ? "Après le rendez-vous, publiez un compte rendu et les prochaines étapes." : "Votre dossier est prêt. Vous retrouverez ici les prochaines étapes après le rendez-vous.",
  };
  if (status === "completed") return {
    ...base,
    actor: openClientTasks && openLawyerTasks
      ? "both" as const
      : openClientTasks
        ? "client" as const
        : openLawyerTasks
          ? "lawyer" as const
          : "none" as const,
    title: openClientTasks || openLawyerTasks ? "Mettez en œuvre les prochaines étapes" : "Consultation terminée",
    detail: openClientTasks || openLawyerTasks ? "La checklist partagée indique précisément qui doit agir." : "Le compte rendu et l’historique restent disponibles.",
    actionLabel: openClientTasks || openLawyerTasks ? "Voir les actions" : "Voir le compte rendu",
    actionTab: openClientTasks || openLawyerTasks ? "tasks" as const : "overview" as const,
  };
  if (status === "declined") return {
    ...base, title: "Cette demande ne sera pas prise en charge", detail: "Le dossier reste intact pour permettre une nouvelle mise en relation.",
  };
  return base;
}

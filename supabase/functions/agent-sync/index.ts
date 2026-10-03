// Edge Function: create or update the ElevenLabs patient agent ("psycholog DONT DELETE") from code.
//   POST → (supervisor only) upserts the agent config and stores its id in app_config.agent_id
// Keeps the agent definition versioned in the repo and the ElevenLabs key in secrets.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { eleven, getConfig, HttpError, isSupervisor, json, requireUser, serve, setConfig } from "../_shared/common.ts";
import { buildPatientVariables, PATIENT_PROMPT } from "../_shared/patient-prompt.ts";

const AGENT_LLM = Deno.env.get("ELEVENLABS_LLM") || "gpt-5.4-mini";
const DEFAULT_VOICE = Deno.env.get("ELEVENLABS_DEFAULT_VOICE");

// Defaults so the agent can also be tried from the ElevenLabs dashboard.
const PLACEHOLDERS = buildPatientVariables(
  { rola: "Marek, 54 lata, magazynier z Krakowa.", plec_postaci: "mężczyzna", pierwsza_wypowiedz: "Dzień dobry." },
  { module: "Pierwsza wizyta", difficulty: 2 },
);

function agentConfig() {
  return {
    name: "psycholog DONT DELETE",
    tags: ["probna-sesja", "hackyeah-2026", "psycholog"],
    conversation_config: {
      agent: {
        first_message: "{{pierwsza_wypowiedz}}",
        language: "pl",
        disable_first_message_interruptions: true,
        dynamic_variables: { dynamic_variable_placeholders: PLACEHOLDERS },
        prompt: {
          prompt: PATIENT_PROMPT,
          llm: AGENT_LLM,
          temperature: 0.8,
          built_in_tools: {
            end_call: {
              name: "end_call",
              description: "Zakończ rozmowę, gdy spełnione są warunki zakończenia albo rozmówca powiedział STOP.",
              params: { system_tool_type: "end_call" },
            },
          },
        },
      },
      tts: { ...(DEFAULT_VOICE ? { voice_id: DEFAULT_VOICE } : {}), model_id: "eleven_flash_v2_5" },
      turn: { turn_eagerness: "patient" },
      conversation: { max_duration_seconds: 1200 },
    },
    platform_settings: {
      overrides: {
        conversation_config_override: {
          tts: { voice_id: true },
          agent: { first_message: true },
        },
      },
      guardrails: {
        version: "1",
        focus: { is_enabled: true },
        prompt_injection: { is_enabled: true },
        // No built-in self_harm content filter: the patient must be able to voice passive
        // death wishes so trainees learn to ask about risk. The custom rule below blocks methods.
        custom: {
          config: {
            configs: [
              {
                is_enabled: true,
                name: "Brak szczegółów metod",
                prompt:
                  "Block the agent if it describes methods, means, places, amounts or plans of self-harm or suicide. Expressing passive thoughts such as 'sometimes I wish I would not wake up' is allowed.",
                execution_mode: "blocking",
                model: "gemini-2.5-flash-lite",
                history_message_count: 1,
                trigger_action: {
                  type: "retry",
                  feedback: "Nie podawaj żadnych szczegółów metod. Odpowiedz wymijająco, w roli. Powód: {{trigger_reason}}",
                },
              },
              {
                is_enabled: true,
                name: "Pacjent nie terapeutyzuje",
                prompt:
                  "Block the agent if it gives therapeutic or medical advice to the user, coaches the user, or speaks as an AI assistant instead of as the simulated patient (except when the user said STOP and the agent is ending the exercise).",
                execution_mode: "blocking",
                model: "gemini-2.5-flash-lite",
                history_message_count: 2,
                trigger_action: {
                  type: "retry",
                  feedback: "Zostań w roli pacjenta i nie doradzaj. Powód: {{trigger_reason}}",
                },
              },
            ],
          },
        },
      },
    },
  };
}

serve(async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
  const user = await requireUser(req);
  if (!(await isSupervisor(user.id))) throw new HttpError(403, "Tylko dla superwizora.");

  const config = agentConfig();
  const existing = await getConfig("agent_id");
  if (existing) {
    await eleven(`/v1/convai/agents/${existing}`, { method: "PATCH", body: JSON.stringify(config) });
    return json({ agent_id: existing, updated: true });
  }
  const res = await eleven("/v1/convai/agents/create", { method: "POST", body: JSON.stringify(config) });
  const { agent_id } = await res.json();
  await setConfig("agent_id", agent_id);
  return json({ agent_id, created: true });
});

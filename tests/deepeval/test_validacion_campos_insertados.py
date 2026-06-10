"""DeepEval suite for the AI-driven (Stagehand) black-box checks of
`validateFieldsInserted` (packages/lib/utils/fields.ts).

It reads the natural-language page-state descriptions produced by
`tests/stagehand/validacion-campos-insertados-ai.js` and uses an LLM-as-judge
(GEval) to verify each one matches the expected validation behaviour for its
graph path (P1-P4, see tests/playwright/PLAN-PRUEBAS-CAJA-NEGRA.md).

The GEval judge runs against OpenRouter (OpenAI-compatible API), not Ollama
(Ollama is only used by the Stagehand agent that produces the JSON below).

Run:
    node tests/stagehand/validacion-campos-insertados-ai.js   # generates output/*.json
    pip install -r tests/deepeval/requirements.txt
    export OPENROUTER_API_KEY=...
    pytest tests/deepeval/test_validacion_campos_insertados.py
"""

import json
import os

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from openrouter_model import OpenRouterModel

RESULTS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "stagehand", "output", "validacion-campos-insertados.json"
)

ESCENARIOS_ESPERADOS = {
    "TC-01": (
        "P1 - sin campos pendientes: a 'Sign' confirmation dialog is visible "
        "(validation passed). No pending field is highlighted and no page jump occurs."
    ),
    "TC-02": (
        "P2 - campo pendiente visible en el DOM: no confirmation dialog is shown "
        "(validation failed). The pending field is highlighted with an orange ring "
        "and the page does not jump to a different page."
    ),
    "TC-03": (
        "P3 - campo pendiente virtualizado fuera del DOM: no confirmation dialog is shown "
        "(validation failed). The PDF viewer jumps/scrolls to a different page (page 2) "
        "to bring the pending field into view."
    ),
    "TC-04": (
        "P4 - falta el contenedor del visor PDF: no confirmation dialog is shown "
        "(validation failed), and no page jump is requested even though a field is pending."
    ),
}

correctness = GEval(
    name="ValidacionCamposInsertados",
    criteria=(
        "Determine whether 'actual_output' (what Stagehand observed on the signing page) "
        "is consistent with 'expected_output' (the validation behaviour validateFieldsInserted "
        "should produce for this scenario)."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.7,
    model=OpenRouterModel(),
)


def _cargar_resultados():
    if not os.path.exists(RESULTS_PATH):
        pytest.skip(
            f"{RESULTS_PATH} no existe. Corre primero "
            "`node tests/stagehand/validacion-campos-insertados-ai.js`."
        )

    with open(RESULTS_PATH, encoding="utf-8") as f:
        return {item["escenario"]: item["resultado"] for item in json.load(f)}


@pytest.mark.parametrize("escenario,expected_output", ESCENARIOS_ESPERADOS.items())
def test_validacion_campos_insertados(escenario, expected_output):
    resultados = _cargar_resultados()

    if escenario not in resultados:
        pytest.fail(f"No hay resultado de Stagehand para {escenario}")

    test_case = LLMTestCase(
        input=f"Estado de validación de la página de firma para el escenario {escenario}",
        actual_output=resultados[escenario],
        expected_output=expected_output,
    )

    assert_test(test_case, [correctness])

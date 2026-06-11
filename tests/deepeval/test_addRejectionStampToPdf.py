"""DeepEval suite for the AI-driven (Stagehand) black-box checks of
`addRejectionStampToPdf` (packages/lib/server-only/pdf/add-rejection-stamp-to-pdf.ts).

It reads the natural-language page-state descriptions produced by
`tests/stagehand/addRejectionStampToPdf-ai.js` and uses an LLM-as-judge
(GEval) to verify each one matches the expected rejection-stamp behaviour
for its scenario (TC-01..TC-03).

The GEval judge runs against OpenRouter (OpenAI-compatible API), not Ollama
(Ollama is only used by the Stagehand agent that produces the JSON below).

Run:
    node tests/stagehand/addRejectionStampToPdf-ai.js   # generates output/*.json
    pip install -r tests/deepeval/requirements.txt
    export OPENROUTER_API_KEY=...
    pytest tests/deepeval/test_addRejectionStampToPdf.py
"""

import json
import os

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from openrouter_model import OpenRouterModel

RESULTS_PATH = os.path.join(os.path.dirname(__file__), "..", "stagehand", "output", "addRejectionStampToPdf.json")

ESCENARIOS_ESPERADOS = {
    "TC-01": (
        "TC-01 - documento rechazado: the document preview shows a red 'DOCUMENT REJECTED' "
        "stamp drawn diagonally across the PDF page, and the document status is Rejected."
    ),
    "TC-02": (
        "TC-02 - lista de documentos: the documents table shows a 'Rejected' status badge "
        "for the most recently rejected document, and opening it shows the same red "
        "'DOCUMENT REJECTED' stamp diagonally across the PDF page."
    ),
    "TC-03": (
        "TC-03 - el sello ignora el motivo: regardless of the rejection reason supplied by "
        "the signer, the only stamp text drawn on the PDF page is exactly 'DOCUMENT REJECTED'. "
        "The rejection reason text itself is not rendered as a stamp on the page."
    ),
}

correctness = GEval(
    name="AddRejectionStampToPdf",
    criteria=(
        "Determine whether 'actual_output' (what Stagehand observed on the document preview "
        "page) is consistent with 'expected_output' (the rejection-stamp behaviour "
        "addRejectionStampToPdf should produce for this scenario)."
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
        pytest.skip(f"{RESULTS_PATH} no existe. Corre primero `node tests/stagehand/addRejectionStampToPdf-ai.js`.")

    with open(RESULTS_PATH, encoding="utf-8") as f:
        return {item["escenario"]: item["resultado"] for item in json.load(f)}


@pytest.mark.parametrize("escenario,expected_output", ESCENARIOS_ESPERADOS.items())
def test_add_rejection_stamp_to_pdf(escenario, expected_output):
    resultados = _cargar_resultados()

    if escenario not in resultados:
        pytest.fail(f"No hay resultado de Stagehand para {escenario}")

    test_case = LLMTestCase(
        input=f"Estado de la previsualización del PDF rechazado para el escenario {escenario}",
        actual_output=resultados[escenario],
        expected_output=expected_output,
    )

    assert_test(test_case, [correctness])

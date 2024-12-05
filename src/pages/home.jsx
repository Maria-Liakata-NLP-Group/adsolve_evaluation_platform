import {useNavigate} from "react-router-dom";
import IMAGES from "../images";

const Home = () => {
    const navigate = useNavigate();

    const openRoute = (route) => navigate(`/${route}`);

    return (
        <div>
            <h1 className="title">AdSolve Evaluation Platform</h1>
            <section className="block">
                <div className="grid is-col-min-20 is-gap-8 content">
                    <div className="cell">
                        <p><b>Background & challenges:</b> State-of-the-art evaluation of LLMs has resulted in large benchmarks containing hundreds of linguistic and programmatic tasks (e.g. reasoning, mathematics, context free QA) and associated metrics meant to assess LLM capabilities. While such benchmarks offer a more challenging evaluation setting for AI systems, requiring more than memorisation ability for many of the tasks, they tell us nothing about the real-world applicability of LLMs in social applications. Evaluation of GPT-4 on medical QA has shown impressive results, with GPT-4 performing 20 points above average on samples from the U.S. Medical Licensing Examination. However, solving exam multiple-choice questions is far removed from the ability to diagnose or monitor a patient over time.</p>

                        <p><b>Foci & implementation:</b> We will operationalise satisfiability of the RRI criteria identified in Work Stream 1 by implementing novel metrics and tasks developed through co-creation. Where appropriate strategies (e.g. memorisation prompting), metrics, tasks and data from existing benchmarks will be included (e.g. counterfactual tasks, inference-based metrics from big-bench or HELM) with the addition of new metrics (e.g. for privacy, inclusivity) and a focus on medical and legal needs. For example for privacy, we will explore re-identification tasks, and adversarial scenarios; for health monitoring, e.g. rationale-based classification, measured against known phenotypes; medical summarisation evaluation against evidence and human preferences using inference based and other metrics. An important consideration will be around how to protect evaluation benchmarks from leaking into training data; according to the recent statement to the Lords by OpenAI, the evaluation of LLMs needs to be performed by independent assessors. We will also explore scenarios for independent model assessment and safe sharing of datasets for training purposes.</p>            
                    </div>
                    <div className="cell">
                        <img src={IMAGES.placeholderDiagram} alt="diagram" />
                    </div>
                </div>
            </section>
            <section className="block">
                <div className="is-flex is-justify-content-space-around pt-5">
                    <button className="button is-large" onClick={() => openRoute("use-cases")}>Explore use cases</button>
                    <button className="button is-large" onClick={() => openRoute("create-new-task")}>Create new task</button>
                </div>
            </section>

        </div>
    );
    }

export default Home
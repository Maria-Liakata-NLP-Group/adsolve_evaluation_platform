import {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom";
import diagramData from "../data/UseCases.json"

const DiagramNavigation = () => {
     const navigate = useNavigate();

    const [useCase, setUseCase] = useState(null)
    const [goals, setGoals] = useState(null)
    const [tasks, setTasks] = useState(null)
    const [aspects, setAspects] = useState(null)

    useEffect(() => {
        if (goals) console.log(diagramData[useCase]?.[goals]?.[tasks]?.[aspects])
        console.log("useCase", useCase)
        console.log("goals", goals)
        console.log("tasks", tasks)
        console.log("aspects", aspects)
    }, [useCase, goals, tasks, aspects])


    const createDiagramNodes = (nodes, level) => {
            let hoverFunction;
            let selectedTag;
            switch (level) {
                case "useCase":
                    hoverFunction = (node) => setUseCase(node)
                    selectedTag = useCase
                    break;
                case "goals":
                    hoverFunction = (node) => setGoals(node)
                    selectedTag = goals
                    break;
                case "tasks":
                    hoverFunction = (node) => setTasks(node)
                    selectedTag = tasks
                    break;
                case "aspects":
                    hoverFunction = (node) => setAspects(node)
                    selectedTag = aspects
                    break;
                default:
                    hoverFunction = null
                    selectedTag = null
            }

            let clickFunction = null;
            if (level === "tasks") {
                clickFunction = (node) => {
                    const useCaseDomain = useCase.replace(/ /g, "-").toLowerCase()
                    const nodeDomain = node.replace(/ /g, "-").toLowerCase()
                    navigate(`/use-cases/${useCaseDomain}/${nodeDomain}`)
                }
            }

            // create tags with node names
            return nodes.map((node) => {
                return <div
                    className={`tag ${node === selectedTag ? "is-dark" : "is-light"} has-border`} 
                    key={node}
                    onMouseOver={() => hoverFunction(node)}
                    onClick={() => clickFunction(node)}
                    >
                        {node}
                    </div>
            }) 
    }

    return (
        <div>
            <h1 className="title">Diagram Navigation</h1>
            <section className="block">
                {/* <div className="fixed-grid has-5-cols"> */}
                    <div className="columns is-multiline">
                        <div className="column is-one-fifth"><h2 className="subtitle">Use case</h2></div>
                        <div className="column is-one-fifth"><h2 className="subtitle">Goals</h2></div>
                        <div className="column is-one-fifth"><h2 className="subtitle">Tasks</h2></div>
                        <div className="column is-one-fifth"><h2 className="subtitle">Aspects</h2></div>
                        <div className="column is-one-fifth"><h2 className="subtitle">Metrics</h2></div>

                        <div className="column is-one-fifth">
                            <div className="is-flex is-flex-direction-column">
                                {createDiagramNodes(Object.keys(diagramData), "useCase")}
                            </div>
                        </div>
                        <div className="column is-one-fifth">
                            <div className="is-flex is-flex-direction-column">
                                {diagramData[useCase] ? createDiagramNodes(Object.keys(diagramData[useCase]), "goals") : ""}
                            </div>
                        </div>
                        <div className="column is-one-fifth">
                            <div className="is-flex is-flex-direction-column">
                                {diagramData[useCase]?.[goals] ? createDiagramNodes(Object.keys(diagramData[useCase][goals]), "tasks") : ""}
                            </div>
                        </div>
                        <div className="column is-one-fifth">
                            <div className="is-flex is-flex-direction-column">
                                {diagramData[useCase]?.[goals]?.[tasks] ? createDiagramNodes(Object.keys(diagramData[useCase][goals][tasks]), "aspects") : ""}
                            </div>
                        </div>
                        <div className="column is-one-fifth">
                            <div className="is-flex is-flex-direction-column">
                                {diagramData[useCase]?.[goals]?.[tasks]?.[aspects] ? createDiagramNodes((diagramData[useCase][goals][tasks][aspects]), "metrics") : ""}
                            </div>
                        </div>
                    </div>
                {/* </div> */}

            </section>
        </div>
    )
}

export default DiagramNavigation
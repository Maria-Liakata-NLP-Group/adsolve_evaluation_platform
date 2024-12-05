import { useParams } from "react-router-dom";
import {useEffect, useState} from "react";
import LeaderBoard from "../components/leaderBoard";


const sortValuesAndKeys = (values, keys) => {
    // Map values to their indices
    const indices = values
        .map((value, index) => ({ value, index }))
        .sort((a, b) => b.value - a.value); // Sort by descending values

    // Extract sorted values and keys
    const sortedValues = indices.map(item => item.value);
    const sortedKeys = indices.map(item => keys[item.index]);

    return [sortedValues, sortedKeys];
};


const Dashboard = () => {
    const { useCase, task } = useParams();
    const [title, setTitle] = useState("");
    const [data, setData] = useState(null);
    const [datasetNames, setDatasetNames] = useState(null);
    const [modelNames, setModelNames] = useState(null);
    const [aspectNames, setAspectNames] = useState(null);
    const [currentDataset, setCurrentDataset] = useState(null);
    const [currentModel, setCurrentModel] = useState(null);
    const [leaderBoardData, setLeaderBoardData] = useState({});
    const [error, setError] = useState(null); 

    useEffect(() => {
        
        if (useCase && task) {
            // replace dashes with spaces
            const useCaseTitle = useCase.replace(/-/g, " ");
            const taskTitle = task.replace(/-/g, " ");

            // create title dom element 
            const titleElement = <h1 className="title is-capitalized">{`${useCaseTitle} -> ${taskTitle}`}</h1>
            setTitle(titleElement)
        }
    }, [useCase, task])


    useEffect(() => {
        const calculateLeaderboards = async () => {
            const leaderBoards = {}
            // Organise data by model
            if (currentDataset !== null) {
                const datasetName = datasetNames[currentDataset];
                for (const aspect of aspectNames) {
                    for (const metric in data[aspect]) {
                        const metricValues = []
                        for (const model of modelNames) {
                            metricValues.push(data[aspect][metric][model][datasetName])
                        }
                        const [sortedValues, sortedKeys] = sortValuesAndKeys(metricValues, modelNames)
                        leaderBoards[aspect] = {
                            "metric": metric,
                            "values": sortedValues,
                            "tags": sortedKeys
                        }
                    }
                }
            }
            // Organise data by dataset
            else if (currentModel !== null) {
                const modelName = modelNames[currentModel];
                for (const aspect of aspectNames) {
                    for (const metric in data[aspect]) {
                        const metricValues = []
                        for (const dataset of datasetNames) {
                            metricValues.push(data[aspect][metric][modelName][dataset])
                        }
                        const [sortedValues, sortedKeys] = sortValuesAndKeys(metricValues, datasetNames)
                        leaderBoards[aspect] = {
                            "metric": metric,
                            "values": sortedValues,
                            "tags": sortedKeys
                        }
                    }
                }    
            }
            // Set the leaderboards
            if (currentDataset !== null || currentModel !== null) {
                setLeaderBoardData(leaderBoards)
            }

        }

        setLeaderBoardData(null)
        calculateLeaderboards();
    }, [currentDataset, currentModel, data, datasetNames, modelNames, aspectNames]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Dynamically import the JSON file based on the title
                const module = await import(`../data/${task}.json`);
                const tempData = module.default;
                
                // Extract model and dataset names
                const firstAspect = tempData[Object.keys(tempData)[0]];
                const tempModelNames = Object.keys(firstAspect[Object.keys(firstAspect)[0]])
                const tempDatasetNames = Object.keys(firstAspect[Object.keys(firstAspect)[0]][tempModelNames[0]])
                
                // Set the data and names
                setData(module.default); 
                setDatasetNames(tempDatasetNames); 
                setModelNames(tempModelNames);
                setAspectNames(Object.keys(tempData));
                setCurrentDataset(0);
            } catch (err) {
                setError(`Could not load data for ${task}`);
            }
        };

        loadData();

    }, [task, data]);





    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!data) {
        return <div>Loading...</div>;
    }


    const clickOnDataset = (index) => {
        setCurrentDataset(index);
        setCurrentModel(null);
    }

    const clickOnModel = (index) => {
        setCurrentModel(index);
        setCurrentDataset(null);
    }


    return (
        <div>
            <h1 className="title">{title}</h1>
            <section className="block">
                <div>
                    <h2 className="subtitle">Filter by</h2>  
                </div>
                <div className="is-flex is-flex-direction-row">
                    <div>
                        <div className="is-flex is-align-items-center">
                            <div style={{"width": "80px"}}>
                                Datasets:
                            </div>
                            <div>
                                <div className="tags">
                                    {datasetNames ? datasetNames.map((datasetName, index) => (
                                        <span key={index} className={`tag has-border ${currentDataset === index ? "is-dark" : "is-light"}`} onClick={() => clickOnDataset(index)}>{datasetName}</span>
                                    )) : "No datasets to display"}
                                </div>   
                            </div>
                        </div>
                        <div className="is-flex is-align-items-center">
                            <div style={{"width": "80px"}}>
                                Models:
                            </div>
                            <div className="tags">
                                {modelNames ? modelNames.map((modelName, index) => (
                                    
                                    <span key={index} className={`tag has-border ${currentModel === index ? "is-dark" : "is-light"}`} onClick={() => clickOnModel(index)}>{modelName}</span>
                                )) : "No models to display"}
                            </div>
                        </div>
                    </div>
                    <div className="is-flex is-flex-direction-column is-justify-content-space-between ml-5">
                        <button className="button is-dark mt-2">Add dataset</button>
                        <button className="button is-dark mb-2">Add model</button>
                    </div>
                </div>
            </section>
            <section className="block">
                <div className="grid is-col-min-20 is-gap-8">
                    {
                        leaderBoardData ?
                            Object.entries(leaderBoardData).map(([aspect, { metric, values, tags }], index) => (
                                <div key={index}>
                                    <LeaderBoard key={index} aspect={aspect} metric={metric} values={values} tags={tags} />
                                </div>
                            ))
                        : "Nothing to see here"
                    }
                </div>
            </section>
        </div>
    );
}

export default Dashboard
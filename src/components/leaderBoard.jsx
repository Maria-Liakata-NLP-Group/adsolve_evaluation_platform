import {useState,useEffect} from 'react';
import ExampleModal from './exampleModal';

const createTimelineDataPoint = (mean, onClickFunction) => {
    return (
        <div className="timeline-dot" onClick={onClickFunction}
                style={{ left: `${100 * mean}%`}}>
        </div>
    )
        
    
}

const metricToTooltip = {
    "MHIC_sem": "This reflects whether the output captures relevant mental health concepts.",
    "FC_expert": "This reflects the average logical consistency of sentences in the generated output relative to the human-written document.",
    "EA": "This reflects whether the final output is consistent with the intermediate outputs.",
    "IntraNLI": "This reflects whether information presented in a model output is logically consistent with the rest of the generated document."
}

const LeaderBoard = ({detail, showDetails, aspect, metric, values, tags}) => {

    const [timelineDataPoints, setTimelineDataPoints] = useState([]);

    useEffect(() => {
        console.log(aspect, metric, values, tags)
    }, [aspect, metric, values, tags])

    useEffect(() => {
        const loadData = async (details) => {
            const allDetailPoints = []
            for (const path of details) {
                const fullPath = `../data/${path}`
                // load json file with data
                const module = await import(fullPath);
                const tempData = module.default;
                const dataPoints = []
                for (const timelineId in tempData) {
                    dataPoints.push(createTimelineDataPoint(
                        tempData[timelineId]["consistency_mean"],
                        () => showDetails(
                                            tempData[timelineId].gold, 
                                            tempData[timelineId].llm_sents,
                                            tempData[timelineId].consistency_by_sents,
                                        )
                    ))
                }
                allDetailPoints.push(dataPoints)
            }
            setTimelineDataPoints(allDetailPoints)

        }   
        if (detail) {
            // load json file with detailed info
            loadData(detail);
        }
        
    }, [detail, showDetails])

    useEffect(() => {
        console.log(timelineDataPoints)
    }
    , [timelineDataPoints])

    return (
        <>
        
        <div className="cell">
            {/* <h1>Leaderboard</h1> */}
            <div className="is-flex is-align-items-center">
                <div>
                    <h2 className="subtitle">{aspect}</h2>
                    <b>Metric: </b> {metric} 
                </div>
                <div className='ml-4'>
                    <div className="tooltip">?
                        <span className="tooltiptext">{metricToTooltip[metric]}</span>
                    </div>
                    
                </div>
            </div>
            <div className="has-border has-rounded p-5">
                <ul>
                    {
                        values.map((value, index) => (
                            <li className="is-relative" key={index}>
                                <progress 
                                            className="progress is-large" 
                                            value={value} 
                                            max="100"
                                            >
                                                {value}%
                                            </progress>
                                <div style={{width: "100%", position: "absolute", top: 0}}>
                                    {
                                        timelineDataPoints[index]
                                    }
                                </div>
                                <span>{tags[index]}</span>
                                
                            </li>
                        ))
                    }
                </ul>
            </div>
        </div>
        </>
    );

}

export default LeaderBoard
import {useState,useEffect} from 'react';
import ExampleModal from './exampleModal';

const createTimelineDataPoint = (mean, onClickFunction) => {
    return (
        <div className="timeline-dot" onClick={onClickFunction}
                style={{ left: `${100 * mean}%`}}>
        </div>
    )
        
    
}

const LeaderBoard = ({detail, showDetails, aspect, metric, values, tags}) => {

    const [timelineDataPoints, setTimelineDataPoints] = useState([]);

    useEffect(() => {
        console.log(aspect, metric, values, tags)
    }, [aspect, metric, values, tags])

    useEffect(() => {
        const loadData = async (path) => {
            // load json file with data
            const module = await import(path);
            const tempData = module.default;
            const dataPoints = []
            for (const timelineId in tempData) {
                dataPoints.push(createTimelineDataPoint(
                    tempData[timelineId]["consistency_mean"],
                    () => showDetails(tempData[timelineId].gold, tempData[timelineId].llm)
                ))
            }
            setTimelineDataPoints(dataPoints)

        }   
        if (detail) {
            // load json file with detailed info
            loadData(`../data/${detail}`);
        }
        
    }, [detail])

    useEffect(() => {
        console.log(timelineDataPoints)
    }
    , [timelineDataPoints])

    return (
        <>
        
        <div className="cell">
            {/* <h1>Leaderboard</h1> */}
            <h2 className="subtitle">{aspect}</h2>
            <h2 className="subtitle">{detail}</h2>
            <b>Metric: </b> {metric}
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
                                        timelineDataPoints
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
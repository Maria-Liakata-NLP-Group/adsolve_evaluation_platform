import ContentSquare from "../components/contentSquare";
import {useNavigate} from "react-router-dom";

const useCaseNames = {
    "useCase1": "Multi-modal medical diagnostics and monitoring",
    "useCase2": "AI support for mental health",
    "useCase3": "AI legal support",
}

const UseCases = () => {

    const navigate = useNavigate();

    const onClick = (title) => navigate(`/use-cases/${title}`);

    return (
        <div>

        <h1 className="title">Use Cases</h1>
            <section className="block">
                <div className="content">
                    
                    <p>THIS IS PLACEHOLDER TEXT FOR A DESCRIPTION Ipsum quis deserunt fugiat deserunt laboris velit. Et voluptate eiusmod deserunt enim cillum ea nulla adipisicing est voluptate voluptate exercitation magna. Eiusmod incididunt do deserunt adipisicing non anim. Aliquip tempor qui ipsum elit ea exercitation enim incididunt ex qui dolore minim. Velit occaecat occaecat Lorem voluptate eiusmod. Excepteur minim enim id Lorem id ea minim adipisicing ipsum nulla.</p>

                </div>
                <div className="m-5"></div>
                <div className="fixed-grid has-4-cols has-2-cols-mobile">
                    <div className="grid">
                    {
                        Object.entries(useCaseNames).map(([key, title]) => {
                            return <ContentSquare title={title} onClick={() => onClick(key)} key={title}/>
                        })
                    }
                    </div>
                </div>
            </section>
        </div>
    );
    }

export default UseCases
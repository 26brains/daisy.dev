import { z } from 'zod';
import {assert} from "chai";

const TriggerTypes = {
    Webhook: 'webhook',
}

const StepTypes = {
    Receiver: 'receiver',
}

export type Trigger = {
    type: string,
    slug: string,
    schema: z.Schema,
}

export type Step = {
    type: string,
    receiver: string,
}
export type Flow = {
    name: string,
    trigger: Trigger,
    steps: Step[],
}

export interface EventReceiver {
    receive<R>(record: R): Promise<void>
}

class App {
    flows: Flow[] = [];
    receivers: Map<string, EventReceiver> = new Map();

    addFlow(flow: Flow){
        this.flows.push(flow);
    }
    async post<R>(slug: string, value: R){
        const flow = this.flows.find(f => f.trigger.slug === slug);
        if(!flow){
            return;
        }
        const result = flow.trigger.schema.safeParse(value);
        if(!result.success){
            return;
        }
        let input = value;
        for(let ii = 0; ii < flow.steps.length; ii++){
            const step = flow.steps[ii];
            const func = this.createStepFunction(step);
            if(!func){
                return;
            }
            const output = await func(input);
            if(!output){
                return;
            }
            input = output;
        }

    }
    addReceiver(name: string, receiver: EventReceiver){
        this.receivers.set(name, receiver)
    }

    createStepFunction<R>(step: Step){
        if(step.type === StepTypes.Receiver){
            const receiver = this.receivers.get(step.receiver);
            return (value: R) => {
                receiver?.receive(value);
                return null;
            }
        }
    }


}

function createApp(): App{
    return new App();
}

describe('automation', () => {

    context('app', () => {

        it('should do something', () => {
            const flow: Flow = {
                name: 'gsh',
                trigger: {
                    type: TriggerTypes.Webhook,
                    slug: '/gsh',
                    schema: z.object({
                        someState: z.number(),
                    }),
                },
                steps: [
                    {
                        type: StepTypes.Receiver,
                        receiver: 'testReceiver'
                    }
                ]
            }

            const testReceiver = {
                state: null as unknown,
                receive<R>(record: R): Promise<void> {
                    this.state = record
                    console.log(record);
                    return Promise.resolve();
                }
            }

            const app = createApp();
            app.addReceiver('testReceiver', testReceiver);
            app.addFlow(flow);

            const requestValue = { someState: 1 };

            app.post('/gsh', requestValue);

            assert.deepEqual(testReceiver.state, requestValue)

        })

    })

})

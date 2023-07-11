import { z } from 'zod';
import {assert} from "chai";

const TriggerTypes = {
    Webhook: 'webhook',
}

const StepTypes = {
    Receiver: 'receiver',
    Transformer: 'transformer',
}

export type Trigger = {
    type: string,
    slug: string,
    schema: z.Schema,
}

export type Step = {
    type: string,
}

export type Receiver = Step & {
    receiver: string,
}
export type Transformer = Step & {
    transformer: (input: any) => any,
}

export type Flow = {
    name: string,
    trigger: Trigger,
    steps: (Receiver | Transformer)[],
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
        let input: any = value;
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
            const receiver = this.receivers.get((step as Receiver).receiver);
            return (value: R) => {
                receiver?.receive(value);
                return null;
            }
        }
        if(step.type === StepTypes.Transformer){
            const { transformer } = (step as Transformer);
            return (value: R) => transformer(value);
        }
    }


}

function createApp(): App{
    return new App();
}

function createFlow(flow: Flow): Flow{
    return flow;
}

describe('automation', () => {
    context('app', () => {
        it('should do receive data', async () => {
            const flow = createFlow({
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
            });
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

            await app.post('/gsh', requestValue);

            assert.deepEqual(testReceiver.state, requestValue)
        })
        it('should receive and trasform data', async () => {
            const flow = createFlow({
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
                        type: StepTypes.Transformer,
                        transformer: (input: { someState: number }) => {
                            return {
                                someState: 4
                            }
                        }
                    },
                    {
                        type: StepTypes.Receiver,
                        receiver: 'testReceiver'
                    }
                ]
            });
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

            await app.post('/gsh', requestValue);

            assert.deepEqual(testReceiver.state, { someState: 4 })
        })
    })
})

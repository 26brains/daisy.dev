import { z } from 'zod';

const AppTypes = {
    Webhook: 'webhook'
}

const schema = z.object({
   action: z.object({
       id: z.number(),
   })
});

export type Trigger = {
    type: string,
    schema: z.Schema,
}

export type Step = {
    name: string,
}
export type Flow = {
    name: string,
    trigger: Trigger,
    steps: Step[],
}

export interface AppStore {
    store<R>(record: R): Promise<void>
}

class App {
    addFlow(flow: Flow){
        //
    }
    post(slug: string){
        //
    }
    addStore(store: AppStore){
        //
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
                    type: AppTypes.Webhook,
                    schema: schema,
                },
                steps: [

                ]
            }

            const store: AppStore = {
                store<R>(record: R): Promise<void> {
                    console.log(record);
                    return Promise.resolve();
                }
            }

            const app = createApp();
            app.addStore(store);
            app.addFlow(flow);
            app.post('/gsh');

        })

    })

})

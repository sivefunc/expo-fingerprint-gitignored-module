import { registerWebModule, NativeModule } from 'expo';

// MyModule is not available on the web platform.
class MyModule extends NativeModule<{}> {}

export default registerWebModule(MyModule, 'MyModule');

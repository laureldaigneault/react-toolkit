# ReactToolkit

A collection of reusable React libraries and styling solutions that I’ve built over the years. This
library is a toolbox designed to help streamline development and improve efficiency across your projects.

Whether you're building a quick prototype or a full-fledged application, you’ll find these components and utilities
handy to reduce boilerplate code and boost productivity.

---

## Features

- **Form Management Hooks and Components**: Simplify form handling with custom hooks and reusable components.
- **Theming System**: Easily apply themes and styles across your application and your own components.
- **Fully Typed**: Written with TypeScript to ensure type safety and clarity.
- **Lightweight**: No heavy dependencies. Simple, clean, and effective.

---

## Installation

You can easily install `ReactToolkit` via npm or yarn:

```bash
npm install @laureldaigneault/react-toolkit
```

## Usage

Here’s a quick example of how to use a button component from the library:

```javascript
import { Form } from 'react-toolkit';

const YourApp = () => (
  <div>
    <Form>
      <Field name="username"/>
    </Form>
  </div>
);
```

## Available Packages:

### ezform

A simple and efficient form management library for React. It provides a set of hooks and components to handle form
state, validation, and submission seamlessly.

### eztheme

A lightweight theming solution for React applications. It allows you to define and apply themes easily, ensuring
consistent styling across your components.

## Development

Clone this repository to contribute or make changes:

```bash
git clone https://github.com/laureldaigneault/react-toolkit.git
cd react-toolkit
npm install
```

To start development locally:

```bash
npm run start
```

To build the library:

```bash
npm run build
```

## Contributing

Pull requests are always welcome! Feel free to fork the repo, submit issues, and create pull requests with your
improvements or suggestions. Let's build an even better toolbox together!

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Thanks to all the open-source communities for their inspiring work and contributions.
- Inspired by the need to create reusable, efficient, and maintainable code!

---

## Future Features

- More components based on community requests.
- Enhanced theming and customization options.
- Better integrations with popular design systems.

---

Enjoy coding with ReactToolkit! 🚀
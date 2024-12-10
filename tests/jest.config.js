module.exports = {
    testEnvironment: 'node',
    verbose: true, // Detailed output
    collectCoverage: true, // Enables code coverage
    coverageDirectory: 'coverage',
    testTimeout: 30000, // Custom timeout for async API tests
    setupFilesAfterEnv: ['./jest.setup.js'], // Custom setup if needed
};

from setuptools import setup, Extension
from Cython.Build import cythonize
import numpy as np

extensions = [
    Extension(
        "checkers_env", 
        ["checkers_env.pyx"], 
        include_dirs=[np.get_include()]
    ),
    Extension(
        "persistence_mcts", 
        ["persistence_mcts.pyx"], 
        include_dirs=[np.get_include()]
    )
]

setup(
    name='Checkers AI MCTS Pipeline',
    ext_modules=cythonize(extensions, compiler_directives={'language_level': "3"})
)
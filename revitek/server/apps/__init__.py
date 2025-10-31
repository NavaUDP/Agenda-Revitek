"""
Package initializer for the apps package.

Having an __init__.py ensures this is a regular Python package (not a namespace
package). unittest's test discovery requires modules to have a __file__ so it
can compute the top-level directory; without this, importing submodules may
produce a module with __file__ == None which breaks test discovery.
"""

__all__ = []

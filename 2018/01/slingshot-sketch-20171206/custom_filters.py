from jinja2._compat import string_types
from jinja2.filters import environmentfilter


# Backport of `make_attrgetter` from a more recent version of Jinja that
# adds the handy `postprocess` argument
def make_attrgetter(environment, attribute, postprocess=None):
    """Returns a callable that looks up the given attribute from a
    passed object with the rules of the environment.  Dots are allowed
    to access attributes of attributes.  Integer parts in paths are
    looked up as integers.
    """
    if attribute is None:
        attribute = []
    elif isinstance(attribute, string_types):
        attribute = [int(x) if x.isdigit() else x for x in attribute.split('.')]
    else:
        attribute = [attribute]

    def attrgetter(item):
        for part in attribute:
            item = environment.getitem(item, part)

        if postprocess is not None:
            item = postprocess(item)

        return item

    return attrgetter


@environmentfilter
def sort_as_int(environment, value, reverse=False, attribute=None):
    """Sort collection after converting the attribute value to an int"""
    def convert_to_int(x):
        val = str(x)
        # Test if this is a string representation of a float.
        # This is what the copy rig does and it's annoying
        if '.' in val:
            val = float(val)

        return int(val)

    key_func = make_attrgetter(
        environment, attribute,
        postprocess=convert_to_int
    )
    return sorted(value, key=key_func, reverse=reverse)


FILTERS = [
    sort_as_int,
]
